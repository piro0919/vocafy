import pg from 'pg';
import { scriptEnv } from './lib/env';
import type { ProducerLinks } from '../src/lib/catalog';
import {
  EXTRA_PRODUCERS,
  isEligible,
  isOwnVersion,
  linksOf,
  UNKNOWN_PRODUCER,
  producersOf,
  sourcesOf,
  vocalistsOf,
} from './lib/pick';
import { deadNiconico, legendVideos } from './lib/niconico';
import {
  artist,
  rootVoicebank,
  songByNiconico,
  songsByArtist,
  songsPublishedAfter,
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
 *   pnpm ingest --recent 30          この 30 日に出た曲のうち、取り込み済みのボカロPの曲を足し、この1年の曲で種に掛かった
 *                                    新しいボカロPの全曲を入れる（自動の取り込みが使う）
 *
 * 種の曲からボカロPを拾い、その人の曲をすべて入れる。線を下げる（--seeds を増やす）ときは、先に --dry で
 * 増え方を数える。ボカロPが1人増えると、その人の全曲がついてくるので、曲数は種の数に比例しない。
 *
 * 種は VocaDB の評価点、ニコニコの伝説入り（100万再生以上）、YouTube の再生数（100万回以上。2018年以降の曲から選ぶ）。
 * 種に掛からないボカロPも、pick.ts の EXTRA_PRODUCERS に書けば全曲を入れる
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

/** DB にある曲の作者の番号。出し直しの版の元の曲が、今回集めた曲に無いとき（新しく出た曲を足すだけのときなど）に引く */
async function ownersInDb(songIds: number[]): Promise<Map<number, Set<number>>> {
  const owners = new Map<number, Set<number>>();
  if (songIds.length === 0) return owners;
  const pool = new pg.Pool({ connectionString: scriptEnv('DATABASE_URL') });
  try {
    const { rows } = await pool.query<{ song_id: number; producer_id: number }>(
      'select song_id, producer_id from song_producer where song_id = any($1)',
      [songIds],
    );
    for (const r of rows)
      owners.set(r.song_id, (owners.get(r.song_id) ?? new Set()).add(r.producer_id));
    return owners;
  } finally {
    await pool.end();
  }
}

/**
 * DB にある、今回集めた曲とは別の曲が使っている動画。出し直しの版が元の曲と同じ動画で登録されていることがあり
 * （quiz と quiz (エルゴスム ver.)）、新しく出た曲を足すだけのときは元の曲が今回集めた曲に無いので、DB も見る
 */
async function videosInDb(videoIds: string[], except: number[]): Promise<Set<string>> {
  if (videoIds.length === 0) return new Set();
  const pool = new pg.Pool({ connectionString: scriptEnv('DATABASE_URL') });
  try {
    const { rows } = await pool.query<{ youtube_id: string | null; niconico_id: string | null }>(
      `select youtube_id, niconico_id from song
       where not (id = any($2)) and (youtube_id = any($1) or niconico_id = any($1))`,
      [videoIds, except],
    );
    return new Set(rows.flatMap((r) => [r.youtube_id, r.niconico_id].filter((v) => v !== null)));
  } finally {
    await pool.end();
  }
}

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

/** 今日から days 日前の日付（2026-10-09 の形） */
function daysAgo(days: number): string {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

/**
 * ニコニコの伝説入り（100万再生以上）の動画を VocaDB の曲に引き当てる。VocaDB に無い動画や、
 * 入れられない曲（カバー・作者や歌声の分からない曲など）は落とす。since を渡すと、その日より後に投稿された動画だけ
 */
async function legendSongs(since?: string): Promise<VdbSong[]> {
  const videos = await legendVideos(since);
  const songs: VdbSong[] = [];
  let done = 0;
  for (const id of videos) {
    const song = await songByNiconico(id);
    // 種はオリジナル曲だけ。出し直しの版まで種にすると、作者不明の入れ物の版から 1300 曲が戻った（2026-10-10）
    if (song && song.songType === 'Original' && isEligible(song)) songs.push(song);
    if (++done % 100 === 0) console.log(`  伝説入り ${done}/${videos.length}: ${songs.length} 曲`);
  }
  return songs;
}

/** YouTube の再生数の線。after より後に出た評価点が 10 以上の曲を候補にし、本家の動画の再生数が YOUTUBE_LINE 以上のものを選ぶ */
const YOUTUBE_LINE = 1_000_000;

async function youtubeSongs(after: string): Promise<VdbSong[]> {
  const candidates = (await youtubeCandidates(after, 10)).filter(
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
 * ニコニコで流せないとみなした動画がこれより多ければ、同じ理由で書かずに止める。2026-10-11 に、ニコニコだけの 5443 曲を
 * 確かめて 52 本だった（その分は DB から外し、unplayable の表に記録してある）
 */
const MAX_DEAD_NICONICO = 300;

/**
 * 自動の取り込みが新しいボカロPを探す範囲。この日数のうちに出た曲だけを、伝説入りと YouTube の再生数の線にかける。
 * 全体の取り込みと同じ 2018 年からにすると、VocaDB に毎週 400 回ほど聞くことになる。1年たってから線を越えた曲の作者は、
 * 手元の全体の取り込みで拾う
 */
const NEW_PRODUCER_DAYS = 365;

/**
 * 自動の取り込みで、新しく全曲を入れるボカロPがこれより多ければ、DB に書かずに止める。人の目を通さないので、
 * VocaDB の登録の誤りや線の決め方の誤りで、知らない人の曲がまとめて入るのを防ぐ。週に数人のつもり
 */
const MAX_NEW_PRODUCERS = 20;

/**
 * 種の曲。評価点の上位 seedCount 曲・ニコニコの伝説入り・YouTube の再生数のどれかを満たすもの。
 * since を渡すと、伝説入りと YouTube の再生数はその日より後に出た曲だけを見て、評価点の上位は見ない。
 * 1年以内の曲が歴代の上位に入ることはまれで、入る曲はたいてい再生数の線にも掛かるので、毎週聞く十数回を省く
 */
async function seedSongs(seedCount: number, since?: string): Promise<VdbSong[]> {
  const rated = since ? [] : (await topRatedSongs(seedCount)).filter(isEligible);
  const legends = process.argv.includes('--no-legend') ? [] : await legendSongs(since);
  const watched = process.argv.includes('--no-youtube')
    ? []
    : await youtubeSongs(since ?? '2018-01-01');
  console.log(
    since
      ? `種: ${since} より後の曲のうち、伝説入り ${legends.length} 曲、YouTube で100万回以上 ${watched.length} 曲`
      : `種: 評価点の上位 ${seedCount} 曲のうち入れられる ${rated.length} 曲、伝説入り ${legends.length} 曲、YouTube で100万回以上 ${watched.length} 曲`,
  );
  return [...new Map([...rated, ...legends, ...watched].map((s) => [s.id, s])).values()];
}

/**
 * VocaDB の名前を置き換えるボカロP。作者の分からない曲をまとめる VocaDB の入れ物（23966）は、どの言語で聞いても
 * 「Unknown producer(s)」で返る。別名にある「作者不明」を使う
 */
const PRODUCER_NAMES = new Map([[UNKNOWN_PRODUCER, '作者不明']]);

/**
 * 新しく出た曲を足すだけの取り込み（--recent <日数>）。その日数のうちに出たオリジナル曲を VocaDB にまとめて聞き、
 * すでに全曲を取り込んだボカロPの曲だけを足す。種の選び直しやボカロPの全曲の取り直しはしないので、
 * VocaDB に聞くのは曲の一覧の数ページ（1週間でおよそ 370 曲）と、表に無い歌声だけで済む。
 * 自動の取り込み（.github/workflows/ingest.yml）はこれを使う。新しいボカロPや種の入れ替えは、手元で全体の取り込みを走らせる
 */
async function recentSongs(days: number): Promise<{
  songs: VdbSong[];
  complete: Set<number>;
  knownVocalists: Map<number, { name: string; baseId: number }>;
}> {
  const pool = new pg.Pool({ connectionString: scriptEnv('DATABASE_URL') });
  try {
    const producers = await pool.query<{ id: number }>('select id from producer where complete');
    const complete = new Set(producers.rows.map((r) => r.id));
    const vocalists = await pool.query<{ id: number; name: string; base_id: number }>(
      'select id, name, base_id from vocalist',
    );
    const songs = (await songsPublishedAfter(daysAgo(days))).filter(
      (s) => isEligible(s) && producersOf(s).some((p) => complete.has(p.id)),
    );
    return {
      songs,
      complete,
      knownVocalists: new Map(
        vocalists.rows.map((v) => [v.id, { name: v.name, baseId: v.base_id }]),
      ),
    };
  } finally {
    await pool.end();
  }
}

async function main() {
  const seedCount = Number(arg('seeds') ?? 1600);
  const recentDays = arg('recent') === undefined ? undefined : Number(arg('recent'));
  const dry = process.argv.includes('--dry');

  const songs = new Map<number, VdbSong>();
  const seedIds = new Set<number>();
  // 全曲を取り込むボカロP。新しく出た曲を足すときは、新しく種に掛かった人だけ（取り込み済みの人の画像やリンクは取り直さない）
  const producerIds = new Set<number>();
  let knownVocalists = new Map<number, { name: string; baseId: number }>();

  if (recentDays !== undefined) {
    const recent = await recentSongs(recentDays);
    for (const s of recent.songs) songs.set(s.id, s);
    knownVocalists = recent.knownVocalists;
    console.log(`この ${recentDays} 日に出た曲のうち、取り込み済みのボカロPの曲: ${songs.size} 曲`);

    // 新しいボカロP。伝説入りと YouTube の線は全体の取り込みと同じで、見る曲の範囲だけを狭める。取り込み済みの人の種の曲は足さない
    // （その人の曲はもう全部入っている）
    for (const s of await seedSongs(seedCount, daysAgo(NEW_PRODUCER_DAYS))) {
      const fresh = producersOf(s).filter(
        (p) => !recent.complete.has(p.id) && p.id !== UNKNOWN_PRODUCER,
      );
      if (fresh.length === 0) continue;
      songs.set(s.id, s);
      seedIds.add(s.id);
      for (const p of fresh) producerIds.add(p.id);
    }
    for (const id of EXTRA_PRODUCERS) if (!recent.complete.has(id)) producerIds.add(id);
    console.log(`新しく全曲を入れるボカロP: ${producerIds.size} 人`);
    if (producerIds.size > MAX_NEW_PRODUCERS) {
      throw new Error(
        `新しいボカロPが ${MAX_NEW_PRODUCERS} 人を超えたので書きません。手元で --recent ${recentDays} --dry を走らせて確かめてください`,
      );
    }
  } else {
    const seeds = await seedSongs(seedCount);
    for (const s of seeds) {
      songs.set(s.id, s);
      seedIds.add(s.id);
      for (const p of producersOf(s)) if (p.id !== UNKNOWN_PRODUCER) producerIds.add(p.id);
    }
    for (const id of EXTRA_PRODUCERS) producerIds.add(id);
    console.log(
      `種: ${seeds.length} 曲、ボカロP ${producerIds.size} 人（手で足した ${EXTRA_PRODUCERS.length} 人を含む）`,
    );
  }

  // ボカロPの全曲。その人が作者として入っている曲だけを拾う（イラストだけ描いた曲などは除く）。
  // 入れない曲も作者だけ覚えておく。出し直しの版の元の曲に動画が無く入らないことがある（エイリアンエイリアン）
  const fetched = new Map<number, Set<number>>();
  let done = 0;
  for (const id of producerIds) {
    for (const song of await songsByArtist(id)) {
      fetched.set(song.id, new Set(producersOf(song).map((p) => p.id)));
      if (isEligible(song) && producersOf(song).some((p) => p.id === id)) songs.set(song.id, song);
    }
    if (++done % 20 === 0) console.log(`  ボカロP ${done}/${producerIds.size}: ${songs.size} 曲`);
  }

  // 出し直しの版は本人のものだけ。元の曲の作者は、今回集めた曲から引き、無ければ DB から引く
  for (const s of songs.values()) fetched.set(s.id, new Set(producersOf(s).map((p) => p.id)));
  const missing = [...songs.values()].flatMap((s) =>
    s.originalVersionId !== undefined && !fetched.has(s.originalVersionId)
      ? [s.originalVersionId]
      : [],
  );
  const stored = await ownersInDb([...new Set(missing)]);
  const ownersOf = (id: number) => fetched.get(id) ?? stored.get(id);
  let others = 0;
  for (const s of [...songs.values()]) {
    if (!isOwnVersion(s, ownersOf)) {
      songs.delete(s.id);
      others++;
    }
  }
  // 同じ動画は1曲にだけ使う。オリジナル曲を先に、出し直しの版は古いものから動画を取る
  const videosOf = (s: VdbSong) =>
    [sourcesOf(s)?.youtubeId, sourcesOf(s)?.niconicoId].filter(
      (v) => v !== null && v !== undefined,
    );
  const order = [...songs.values()].sort(
    (a, b) =>
      Number(a.songType !== 'Original') - Number(b.songType !== 'Original') ||
      (a.publishDate ?? '').localeCompare(b.publishDate ?? ''),
  );
  const taken = await videosInDb(order.filter((s) => s.songType !== 'Original').flatMap(videosOf), [
    ...songs.keys(),
  ]);
  for (const s of order) {
    const videos = videosOf(s);
    if (s.songType !== 'Original' && videos.some((v) => taken.has(v))) {
      songs.delete(s.id);
      others++;
      continue;
    }
    for (const v of videos) taken.add(v);
  }
  const versions = [...songs.values()].filter((s) => s.songType !== 'Original').length;
  console.log(
    `出し直しの版: ${versions} 曲を入れ、他人のもの・元の曲が分からないもの・入れない版・動画が重なるもの ${others} 曲を外す`,
  );

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
  // YouTube で流せない曲は、ニコニコの埋め込みのページも確かめる。センシティブ扱いの動画と消えた動画は、
  // VocaDB に残っていても流せない（--dry では確かめない）
  const deadNico = await deadNiconico(
    [...sources.values()].flatMap((s) => (!s.youtubeId && s.niconicoId ? [s.niconicoId] : [])),
  );
  for (const found of sources.values())
    if (found.niconicoId && deadNico.has(found.niconicoId)) found.niconicoId = null;
  const dropped = all.filter((s) => {
    const found = sources.get(s.id)!;
    return !found.youtubeId && !found.niconicoId;
  });
  const kept = all.filter((s) => !dropped.includes(s));
  console.log(
    `流せない動画: YouTube ${dead.size} 本・ニコニコ ${deadNico.size} 本（外す ${dropped.length} 曲。ほかは YouTube からニコニコに切り替え）`,
  );
  if (deadNico.size > MAX_DEAD_NICONICO) {
    throw new Error(
      `ニコニコで流せない動画が ${MAX_DEAD_NICONICO} 本を超えたので書きません。data/raw/niconico/embed.json を確かめてください`,
    );
  }
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
    // 表にある歌声は、表の名前と根をそのまま使う（新しく出た曲を足すだけのとき、VocaDB に聞き直さないため）
    const known = knownVocalists.get(v.id);
    if (known) {
      vocalists.set(v.id, { ...v, name: known.name });
      roots.set(v.id, known.baseId);
      continue;
    }
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
      `insert into song (id, name, published_on, rating_score, favorited_times, youtube_id, niconico_id, seed, niconico_thumb, romaji)
       select * from jsonb_to_recordset($1) as x(id integer, name text, published_on date,
         rating_score integer, favorited_times integer, youtube_id text, niconico_id text, seed boolean,
         niconico_thumb text, romaji text)
       on conflict (id) do update set name = excluded.name, published_on = excluded.published_on,
         niconico_thumb = excluded.niconico_thumb, romaji = excluded.romaji,
         rating_score = excluded.rating_score, favorited_times = excluded.favorited_times,
         youtube_id = excluded.youtube_id, niconico_id = excluded.niconico_id,
         seed = song.seed or excluded.seed, imported_at = now()`,
      [
        JSON.stringify(
          kept.map((s) => {
            const source = sources.get(s.id)!;
            const romaji = romajiOf(s);
            return {
              id: s.id,
              name: s.name,
              published_on: s.publishDate?.slice(0, 10) ?? null,
              rating_score: s.ratingScore,
              favorited_times: s.favoritedTimes,
              youtube_id: source.youtubeId,
              niconico_id: source.niconicoId,
              seed: seedIds.has(s.id),
              niconico_thumb: source.niconicoThumb,
              // 検索でローマ字でも引けるよう残す。曲名と同じなら（英語の曲名など）持たない
              romaji: romaji === s.name ? null : (romaji ?? null),
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
