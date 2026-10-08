// DB を読むのはサーバーだけ。ブラウザ側の部品から値として読み込むとビルドで止まるよう、サーバー専用にする（型だけの読み込みは構わない）
import 'server-only';
import pg from 'pg';
import { cache } from 'react';
import { env } from '@/env';

// 正本は VocaDB。DB の中身は scripts/ingest.ts が取り込んだもので、手で直さない

/** 再生の順番待ちに積む1曲。どのボカロPの画面から流したかを持ち、プレイヤーの帯に出す */
export type QueueItem = {
  songId: number;
  title: string;
  videoId: string;
  producerId: number;
  producerName: string;
  /** 歌声の名前を「・」でつないだもの */
  vocalists: string;
};

/** 一覧に出す1曲。ニコニコにしか本家が無い曲は youtubeId が null で、いまは流せない */
export type Song = {
  id: number;
  title: string;
  youtubeId: string | null;
  niconicoId: string | null;
  year: number | null;
  /** 曲の作者。合作なら複数 */
  producers: { id: number; name: string }[];
  vocalists: string[];
};

export type Producer = { id: number; name: string; picture: string | null; songCount: number };

let pool: pg.Pool | undefined;

/** 初めて使うときに作る。読み込みの時点で作ると、DATABASE_URL の無い型の確かめなどが落ちる */
function db(): pg.Pool {
  pool ??= new pg.Pool({ connectionString: env.DATABASE_URL, max: 3 });
  return pool;
}

type SongRow = {
  id: number;
  name: string;
  youtube_id: string | null;
  niconico_id: string | null;
  year: number | null;
  producers: { id: number; name: string }[];
  vocalists: string[];
};

/** 曲に、作者と歌声（補助の歌声は後ろ）を付けて読む。where と order は呼ぶ側が書く */
const SONG_SELECT = `
  select s.id, s.name, s.youtube_id, s.niconico_id,
    extract(year from s.published_on)::int as year,
    (select coalesce(json_agg(json_build_object('id', p.id, 'name', p.name) order by p.complete desc, p.id), '[]')
       from song_producer sp join producer p on p.id = sp.producer_id where sp.song_id = s.id) as producers,
    (select coalesce(json_agg(v.name order by sv.support, v.id), '[]')
       from song_vocalist sv join vocalist v on v.id = sv.vocalist_id where sv.song_id = s.id) as vocalists
  from song s`;

const toSong = (r: SongRow): Song => ({
  id: r.id,
  title: r.name,
  youtubeId: r.youtube_id,
  niconicoId: r.niconico_id,
  year: r.year,
  producers: r.producers,
  vocalists: r.vocalists,
});

/** 曲を順番待ちの形にする。producer は、どのボカロPの画面で流すか。流せない曲は外す */
export function queueOf(songs: Song[], producer?: { id: number; name: string }): QueueItem[] {
  return songs.flatMap((s) => {
    const by = producer ?? s.producers[0];
    return s.youtubeId && by
      ? [
          {
            songId: s.id,
            title: s.title,
            videoId: s.youtubeId,
            producerId: by.id,
            producerName: by.name,
            vocalists: s.vocalists.join('・'),
          },
        ]
      : [];
  });
}

/** 一覧に出すボカロP（全曲を取り込んだ人）。曲の評価点の合計が高い順 */
export const producers = cache(async (): Promise<Producer[]> => {
  const { rows } = await db().query<{
    id: number;
    name: string;
    picture: string | null;
    song_count: number;
  }>(`
    select p.id, p.name, p.picture, count(*)::int as song_count
    from producer p
    join song_producer sp on sp.producer_id = p.id
    join song s on s.id = sp.song_id
    where p.complete
    group by p.id
    order by sum(s.rating_score) desc`);
  return rows.map((r) => ({ id: r.id, name: r.name, picture: r.picture, songCount: r.song_count }));
});

/** ボカロPと、その人の曲（評価点の高い順）。合作の相手として名前だけ入った人は出さない */
export const findProducer = cache(
  async (id: number): Promise<{ producer: Producer; songs: Song[] } | undefined> => {
    if (!Number.isSafeInteger(id)) return;
    const { rows } = await db().query<{ id: number; name: string; picture: string | null }>(
      'select id, name, picture from producer where id = $1 and complete',
      [id],
    );
    const found = rows[0];
    if (!found) return;
    const songs = await db().query<SongRow>(
      `${SONG_SELECT}
       where exists (select 1 from song_producer sp where sp.song_id = s.id and sp.producer_id = $1)
       order by s.rating_score desc, s.id`,
      [id],
    );
    return {
      producer: { ...found, songCount: songs.rows.length },
      songs: songs.rows.map(toSong),
    };
  },
);

/**
 * 人気曲。評価点でそのまま並べると一部のボカロPだけで埋まるので、ボカロPごとの1曲目を評価点の高い順に並べ、
 * 足りなければ2曲目、3曲目と順に足す。流せる曲だけ
 */
export const popularSongs = cache(async (limit: number): Promise<QueueItem[]> => {
  const { rows } = await db().query<{
    id: number;
    name: string;
    youtube_id: string;
    producer_id: number;
    producer_name: string;
    vocalists: string;
  }>(
    `select * from (
       select s.id, s.name, s.youtube_id, s.rating_score, p.id as producer_id, p.name as producer_name,
         (select coalesce(string_agg(v.name, '・' order by sv.support, v.id), '')
            from song_vocalist sv join vocalist v on v.id = sv.vocalist_id where sv.song_id = s.id) as vocalists,
         row_number() over (partition by p.id order by s.rating_score desc, s.id) as rank
       from song s
       join song_producer sp on sp.song_id = s.id
       join producer p on p.id = sp.producer_id and p.complete
       where s.youtube_id is not null
     ) ranked
     where rank <= 3
     order by rank, rating_score desc`,
  );
  // 合作の曲は作者の数だけ出てくるので、最初に出た1つだけを使う
  const seen = new Set<number>();
  return rows
    .filter((r) => !seen.has(r.id) && seen.add(r.id))
    .slice(0, limit)
    .map((r) => ({
      songId: r.id,
      title: r.name,
      videoId: r.youtube_id,
      producerId: r.producer_id,
      producerName: r.producer_name,
      vocalists: r.vocalists,
    }));
});
