import pg from 'pg';
import { scriptEnv } from './lib/env';
import { isEligible, producersOf, sourcesOf, vocalistsOf } from './lib/pick';
import { rowOf } from '../src/lib/kana';
import { artist, rootVoicebank, songsByArtist, topRatedSongs, type VdbSong } from './lib/vocadb';

/**
 * VocaDB から曲を取り込む。
 *
 *   pnpm ingest --seeds 200          評価点の上位 200 曲を種にして、DB に書く
 *   pnpm ingest --seeds 400 --dry    書かずに、何曲・何人になるかだけ数える
 *
 * 種の曲からボカロPを拾い、その人の曲をすべて入れる。線を下げる（--seeds を増やす）ときは、先に --dry で
 * 増え方を数える。ボカロPが1人増えると、その人の全曲がついてくるので、曲数は種の数に比例しない。
 *
 * いまの種は VocaDB の評価点だけ。ニコニコの伝説入りと YouTube の再生数の線は、次の周回で足す
 */
function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function main() {
  const seedCount = Number(arg('seeds') ?? 200);
  const dry = process.argv.includes('--dry');

  const seeds = (await topRatedSongs(seedCount)).filter(isEligible);
  const seedIds = new Set(seeds.map((s) => s.id));
  const producerIds = new Set(seeds.flatMap((s) => producersOf(s).map((p) => p.id)));
  console.log(
    `種: ${seeds.length} 曲（上位 ${seedCount} 曲のうち入れられるもの）、ボカロP ${producerIds.size} 人`,
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

  // 画像は全曲を取ったボカロPの分だけ取りに行く。合作の相手は名前だけ
  const pictures = new Map<number, string | null>();
  for (const id of producerIds) {
    const a = await artist(id);
    pictures.set(id, a.mainPicture?.urlOriginal ?? a.mainPicture?.urlThumb ?? null);
  }

  // 歌声をキャラごとにまとめるため、元の歌声を根までたどる。根の歌声が曲に出てこなくても、表には入れる
  const roots = new Map<number, number>();
  for (const v of vocalists.values()) {
    const root = await rootVoicebank(v.id);
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
      `insert into producer (id, name, picture, complete)
       select * from jsonb_to_recordset($1) as x(id integer, name text, picture text, complete boolean)
       on conflict (id) do update set name = excluded.name,
         picture = coalesce(excluded.picture, producer.picture),
         complete = producer.complete or excluded.complete`,
      [
        JSON.stringify(
          [...producers.values()].map((p) => ({
            id: p.id,
            name: p.name,
            picture: pictures.get(p.id) ?? null,
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
      `insert into song (id, name, published_on, rating_score, favorited_times, youtube_id, niconico_id, seed, kana_row, niconico_thumb)
       select * from jsonb_to_recordset($1) as x(id integer, name text, published_on date,
         rating_score integer, favorited_times integer, youtube_id text, niconico_id text, seed boolean,
         kana_row text, niconico_thumb text)
       on conflict (id) do update set name = excluded.name, published_on = excluded.published_on,
         kana_row = excluded.kana_row, niconico_thumb = excluded.niconico_thumb,
         rating_score = excluded.rating_score, favorited_times = excluded.favorited_times,
         youtube_id = excluded.youtube_id, niconico_id = excluded.niconico_id,
         seed = song.seed or excluded.seed, imported_at = now()`,
      [
        JSON.stringify(
          all.map((s) => {
            const sources = sourcesOf(s)!;
            return {
              id: s.id,
              name: s.name,
              published_on: s.publishDate?.slice(0, 10) ?? null,
              rating_score: s.ratingScore,
              favorited_times: s.favoritedTimes,
              youtube_id: sources.youtubeId,
              niconico_id: sources.niconicoId,
              seed: seedIds.has(s.id),
              kana_row: rowOf(s.name, s.names?.find((n) => n.language === 'Romaji')?.value),
              niconico_thumb: sources.niconicoThumb,
            };
          }),
        ),
      ],
    );
    // 作者と歌声は、VocaDB の今の登録に合わせて入れ直す
    const ids = all.map((s) => s.id);
    await client.query('delete from song_producer where song_id = any($1)', [ids]);
    await client.query('delete from song_vocalist where song_id = any($1)', [ids]);
    await client.query(
      `insert into song_producer (song_id, producer_id)
       select distinct * from jsonb_to_recordset($1) as x(song_id integer, producer_id integer)`,
      [
        JSON.stringify(
          all.flatMap((s) => producersOf(s).map((p) => ({ song_id: s.id, producer_id: p.id }))),
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
          all.flatMap((s) =>
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

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
