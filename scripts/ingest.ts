import pg from 'pg';
import { scriptEnv } from './lib/env';
import { isEligible, producersOf, sourcesOf, vocalistsOf } from './lib/pick';
import { artist, songsByArtist, topRatedSongs, type VdbSong } from './lib/vocadb';

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

  const pool = new pg.Pool({ connectionString: scriptEnv('DATABASE_URL') });
  const client = await pool.connect();
  try {
    await client.query('begin');
    for (const p of producers.values()) {
      await client.query(
        `insert into producer (id, name, picture, complete) values ($1, $2, $3, $4)
         on conflict (id) do update set name = excluded.name,
           picture = coalesce(excluded.picture, producer.picture),
           complete = producer.complete or excluded.complete`,
        [p.id, p.name, pictures.get(p.id) ?? null, producerIds.has(p.id)],
      );
    }
    for (const v of vocalists.values()) {
      await client.query(
        `insert into vocalist (id, name, kind) values ($1, $2, $3)
         on conflict (id) do update set name = excluded.name, kind = excluded.kind`,
        [v.id, v.name, v.artistType],
      );
    }
    for (const s of all) {
      const sources = sourcesOf(s)!;
      await client.query(
        `insert into song (id, name, published_on, rating_score, favorited_times, youtube_id, niconico_id, seed)
         values ($1, $2, $3, $4, $5, $6, $7, $8)
         on conflict (id) do update set name = excluded.name, published_on = excluded.published_on,
           rating_score = excluded.rating_score, favorited_times = excluded.favorited_times,
           youtube_id = excluded.youtube_id, niconico_id = excluded.niconico_id,
           seed = song.seed or excluded.seed, imported_at = now()`,
        [
          s.id,
          s.name,
          s.publishDate?.slice(0, 10) ?? null,
          s.ratingScore,
          s.favoritedTimes,
          sources.youtubeId,
          sources.niconicoId,
          seedIds.has(s.id),
        ],
      );
      // 作者と歌声は、VocaDB の今の登録に合わせて入れ直す
      await client.query('delete from song_producer where song_id = $1', [s.id]);
      await client.query('delete from song_vocalist where song_id = $1', [s.id]);
      for (const p of new Map(producersOf(s).map((p) => [p.id, p])).values()) {
        await client.query('insert into song_producer (song_id, producer_id) values ($1, $2)', [
          s.id,
          p.id,
        ]);
      }
      for (const v of new Map(vocalistsOf(s).map((v) => [v.id, v])).values()) {
        await client.query(
          'insert into song_vocalist (song_id, vocalist_id, support) values ($1, $2, $3)',
          [s.id, v.id, v.support],
        );
      }
    }
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
