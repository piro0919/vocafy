import pg from 'pg';
import { scriptEnv } from './lib/env';
import type { ProducerLinks } from '../src/lib/catalog';
import { isEligible, linksOf, producersOf, sourcesOf, vocalistsOf } from './lib/pick';
import { rowOf } from '../src/lib/kana';
import { legendVideos } from './lib/niconico';
import {
  artist,
  rootVoicebank,
  songByNiconico,
  songsByArtist,
  topRatedSongs,
  youtubeCandidates,
  type VdbSong,
} from './lib/vocadb';
import { deadYouTube, viewCounts } from './lib/youtube';

/**
 * VocaDB から曲を取り込む。
 *
 *   pnpm ingest --seeds 200          評価点の上位 200 曲と、ニコニコの伝説入りを種にして、DB に書く
 *   pnpm ingest --seeds 400 --dry    書かずに、何曲・何人になるかだけ数える
 *   pnpm ingest --no-legend          ニコニコの伝説入りを種に入れない
 *   pnpm ingest --no-youtube         YouTube の再生数の線を種に入れない（YOUTUBE_API_KEY が要らなくなる）
 *
 * 種の曲からボカロPを拾い、その人の曲をすべて入れる。線を下げる（--seeds を増やす）ときは、先に --dry で
 * 増え方を数える。ボカロPが1人増えると、その人の全曲がついてくるので、曲数は種の数に比例しない。
 *
 * 種は VocaDB の評価点、ニコニコの伝説入り（100万再生以上）、YouTube の再生数（100万回以上。2018年以降の曲から選ぶ）
 */
/** 再生中に流せないと分かった動画。表がまだ無い DB（0004 を当てる前）では空 */
async function readUnplayable(): Promise<{ youtube: Set<string>; niconico: Set<string> }> {
  const pool = new pg.Pool({ connectionString: scriptEnv('DATABASE_URL') });
  try {
    const { rows } = await pool.query<{ service: string; video_id: string }>(
      'select service, video_id from unplayable',
    );
    const of = (service: string) =>
      new Set(rows.filter((r) => r.service === service).map((r) => r.video_id));
    return { youtube: of('youtube'), niconico: of('niconico') };
  } catch {
    return { youtube: new Set(), niconico: new Set() };
  } finally {
    await pool.end();
  }
}

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

/**
 * ニコニコの伝説入り（100万再生以上）の動画を VocaDB の曲に引き当てる。VocaDB に無い動画や、
 * 入れられない曲（カバー・作者や歌声の分からない曲など）は落とす
 */
async function legendSongs(): Promise<VdbSong[]> {
  const videos = await legendVideos();
  const songs: VdbSong[] = [];
  let done = 0;
  for (const id of videos) {
    const song = await songByNiconico(id);
    if (song && isEligible(song)) songs.push(song);
    if (++done % 100 === 0) console.log(`  伝説入り ${done}/${videos.length}: ${songs.length} 曲`);
  }
  return songs;
}

/** YouTube の再生数の線。2018年以降で評価点が 10 以上の曲を候補にし、本家の動画の再生数が YOUTUBE_LINE 以上のものを選ぶ */
const YOUTUBE_LINE = 1_000_000;

async function youtubeSongs(): Promise<VdbSong[]> {
  const candidates = (await youtubeCandidates('2018-01-01', 10)).filter(
    (s) => isEligible(s) && sourcesOf(s)?.youtubeId,
  );
  const views = await viewCounts(
    candidates.map((s) => sourcesOf(s)!.youtubeId!),
    scriptEnv('YOUTUBE_API_KEY'),
  );
  return candidates.filter((s) => (views.get(sourcesOf(s)!.youtubeId!) ?? 0) >= YOUTUBE_LINE);
}

/**
 * YouTube で流せないとみなした動画がこれより多ければ、DB に書かずに止める。取り込みは人の目を通さずに自動で回るので
 * （.github/workflows/ingest.yml）、YouTube が一時的に 403 などを返して大量の動画を流せないと誤ってみなしたとき、
 * 曲をまとめて外したりニコニコに切り替えたりしないため。2026-10-09 の時点で 103 本。本当に増えたときは線を上げる
 */
const MAX_DEAD = 300;

/**
 * VocaDB の名前を置き換えるボカロP。作者の分からない曲をまとめる VocaDB の入れ物（23966）は、どの言語で聞いても
 * 「Unknown producer(s)」で返る。別名にある「作者不明」を使う
 */
const PRODUCER_NAMES = new Map([[23966, '作者不明']]);

async function main() {
  const seedCount = Number(arg('seeds') ?? 200);
  const dry = process.argv.includes('--dry');

  const rated = (await topRatedSongs(seedCount)).filter(isEligible);
  const legends = process.argv.includes('--no-legend') ? [] : await legendSongs();
  const watched = process.argv.includes('--no-youtube') ? [] : await youtubeSongs();
  const seeds = [...new Map([...rated, ...legends, ...watched].map((s) => [s.id, s])).values()];
  const seedIds = new Set(seeds.map((s) => s.id));
  const producerIds = new Set(seeds.flatMap((s) => producersOf(s).map((p) => p.id)));
  console.log(
    `種: ${seeds.length} 曲（評価点の上位 ${seedCount} 曲のうち入れられる ${rated.length} 曲、伝説入り ${legends.length} 曲、YouTube で100万回以上 ${watched.length} 曲）、ボカロP ${producerIds.size} 人`,
  );

  // ボカロPの全曲。その人が作者として入っている曲だけを拾う（イラストだけ描いた曲などは除く）
  const songs = new Map<number, VdbSong>(seeds.map((s) => [s.id, s]));
  let done = 0;
  for (const id of producerIds) {
    for (const song of await songsByArtist(id)) {
      if (isEligible(song) && producersOf(song).some((p) => p.id === id)) songs.set(song.id, song);
    }
    if (++done % 20 === 0) console.log(`  ボカロP ${done}/${producerIds.size}: ${songs.size} 曲`);
  }

  // 合作の相手も作者として表に入る。その人の全曲までは取りに行かない（線を下げたときに広がりすぎる）
  const all = [...songs.values()];
  const producers = new Map(all.flatMap((s) => producersOf(s)).map((p) => [p.id, p]));
  const vocalists = new Map(all.flatMap((s) => vocalistsOf(s)).map((v) => [v.id, v]));
  const youtube = all.filter((s) => sourcesOf(s)?.youtubeId).length;
  console.log(
    `曲 ${all.length}（YouTube ${youtube}・ニコニコだけ ${all.length - youtube}）、ボカロP ${producers.size} 人（全曲を取ったのは ${producerIds.size} 人）、歌声 ${vocalists.size}`,
  );
  if (dry) return;

  // YouTube で消えた・埋め込めない動画は使わない。ニコニコに本家があればニコニコで流し、無ければその曲を外す。
  // VocaDB の登録は、YouTube の側で動画が消えてもそのまま残っていることがある（--dry では確かめない）
  const dead = await deadYouTube(all.flatMap((s) => sourcesOf(s)?.youtubeId ?? []));
  // 再生中に流せないと分かった動画（API が確かめて unplayable の表に書いたもの）も使わない
  const reported = await readUnplayable();
  for (const id of reported.youtube) dead.add(id);
  const sources = new Map(
    all.map((s) => {
      const found = sourcesOf(s)!;
      return [
        s.id,
        {
          ...found,
          youtubeId: found.youtubeId && dead.has(found.youtubeId) ? null : found.youtubeId,
          niconicoId:
            found.niconicoId && reported.niconico.has(found.niconicoId) ? null : found.niconicoId,
        },
      ];
    }),
  );
  const dropped = all.filter((s) => {
    const found = sources.get(s.id)!;
    return !found.youtubeId && !found.niconicoId;
  });
  const kept = all.filter((s) => !dropped.includes(s));
  console.log(
    `YouTube で流せない動画 ${dead.size} 本（ニコニコに切り替え ${dead.size - dropped.length} 曲・外す ${dropped.length} 曲）`,
  );
  if (dead.size > MAX_DEAD) {
    throw new Error(
      `YouTube で流せない動画が ${MAX_DEAD} 本を超えたので書きません。data/raw/youtube/oembed.json を確かめてください`,
    );
  }

  // 画像とリンクは全曲を取ったボカロPの分だけ取りに行く。合作の相手は名前だけ
  const pictures = new Map<number, string | null>();
  const links = new Map<number, ProducerLinks>();
  for (const id of producerIds) {
    const a = await artist(id);
    pictures.set(id, a.mainPicture?.urlOriginal ?? a.mainPicture?.urlThumb ?? null);
    links.set(id, linksOf(a.webLinks ?? []));
  }

  // 歌声をキャラごとにまとめるため、元の歌声を根までたどる。根の歌声が曲に出てこなくても、表には入れる
  const roots = new Map<number, number>();
  for (const v of [...vocalists.values()]) {
    const { self, root } = await rootVoicebank(v.id);
    vocalists.set(v.id, { ...v, name: self.name });
    roots.set(v.id, root.id);
    if (!vocalists.has(root.id)) vocalists.set(root.id, { ...root, support: false });
    roots.set(root.id, root.id);
  }

  const pool = new pg.Pool({ connectionString: scriptEnv('DATABASE_URL') });
  const client = await pool.connect();
  try {
    await client.query('begin');
    // 1行ずつ書くと、海の向こうの DB（Neon）では往復が数万回になって1時間を超える。表ごとに JSON にまとめて1回で書く
    await client.query(
      `insert into producer (id, name, picture, links, complete)
       select id, name, picture, coalesce(links, '{}'), complete
       from jsonb_to_recordset($1) as x(id integer, name text, picture text, links jsonb, complete boolean)
       on conflict (id) do update set name = excluded.name,
         picture = coalesce(excluded.picture, producer.picture),
         links = case when excluded.complete then excluded.links else producer.links end,
         complete = producer.complete or excluded.complete`,
      [
        JSON.stringify(
          [...producers.values()].map((p) => ({
            id: p.id,
            name: PRODUCER_NAMES.get(p.id) ?? p.name,
            picture: pictures.get(p.id) ?? null,
            links: links.get(p.id) ?? null,
            complete: producerIds.has(p.id),
          })),
        ),
      ],
    );
    await client.query(
      `insert into vocalist (id, name, kind, base_id)
       select * from jsonb_to_recordset($1) as x(id integer, name text, kind text, base_id integer)
       on conflict (id) do update set name = excluded.name, kind = excluded.kind, base_id = excluded.base_id`,
      [
        JSON.stringify(
          [...vocalists.values()].map((v) => ({
            id: v.id,
            name: v.name,
            kind: v.artistType,
            base_id: roots.get(v.id) ?? v.id,
          })),
        ),
      ],
    );
    await client.query(
      `insert into song (id, name, published_on, rating_score, favorited_times, youtube_id, niconico_id, seed, kana_row, niconico_thumb, romaji)
       select * from jsonb_to_recordset($1) as x(id integer, name text, published_on date,
         rating_score integer, favorited_times integer, youtube_id text, niconico_id text, seed boolean,
         kana_row text, niconico_thumb text, romaji text)
       on conflict (id) do update set name = excluded.name, published_on = excluded.published_on,
         kana_row = excluded.kana_row, niconico_thumb = excluded.niconico_thumb, romaji = excluded.romaji,
         rating_score = excluded.rating_score, favorited_times = excluded.favorited_times,
         youtube_id = excluded.youtube_id, niconico_id = excluded.niconico_id,
         seed = song.seed or excluded.seed, imported_at = now()`,
      [
        JSON.stringify(
          kept.map((s) => {
            const source = sources.get(s.id)!;
            return {
              id: s.id,
              name: s.name,
              published_on: s.publishDate?.slice(0, 10) ?? null,
              rating_score: s.ratingScore,
              favorited_times: s.favoritedTimes,
              youtube_id: source.youtubeId,
              niconico_id: source.niconicoId,
              seed: seedIds.has(s.id),
              kana_row: rowOf(s.name, romajiOf(s)),
              niconico_thumb: source.niconicoThumb,
              // 検索でローマ字でも引けるよう残す。曲名と同じなら（英語の曲名など）持たない
              romaji: romajiOf(s) === s.name ? null : (romajiOf(s) ?? null),
            };
          }),
        ),
      ],
    );
    // 作者と歌声は、VocaDB の今の登録に合わせて入れ直す
    const ids = kept.map((s) => s.id);
    // 前の取り込みで入ったが、今回は流せないと分かった曲を消す（作者と歌声のつながりも一緒に消える）
    await client.query('delete from song where id = any($1)', [dropped.map((s) => s.id)]);
    await client.query('delete from song_producer where song_id = any($1)', [ids]);
    await client.query('delete from song_vocalist where song_id = any($1)', [ids]);
    await client.query(
      `insert into song_producer (song_id, producer_id)
       select distinct * from jsonb_to_recordset($1) as x(song_id integer, producer_id integer)`,
      [
        JSON.stringify(
          kept.flatMap((s) => producersOf(s).map((p) => ({ song_id: s.id, producer_id: p.id }))),
        ),
      ],
    );
    await client.query(
      `insert into song_vocalist (song_id, vocalist_id, support)
       select distinct on (song_id, vocalist_id) *
       from jsonb_to_recordset($1) as x(song_id integer, vocalist_id integer, support boolean)
       order by song_id, vocalist_id, support`,
      [
        JSON.stringify(
          kept.flatMap((s) =>
            vocalistsOf(s).map((v) => ({ song_id: s.id, vocalist_id: v.id, support: v.support })),
          ),
        ),
      ],
    );
    await client.query('commit');
    console.log('DB に書きました');
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

/** VocaDB の Romaji の名前。無ければ undefined */
function romajiOf(song: VdbSong): string | undefined {
  return song.names?.find((n) => n.language === 'Romaji')?.value;
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
