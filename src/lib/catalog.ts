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

/** 投稿日の付いた、流せる1曲 */
export type DatedItem = QueueItem & { publishedOn: string };

type QueueRow = {
  id: number;
  name: string;
  youtube_id: string;
  published_on: string | null;
  producer_id: number;
  producer_name: string;
  vocalists: string;
};

/**
 * 流せる曲を、順番待ちの形で読む。作者は全曲を取り込んだ人を先にして1人だけ付ける（押すとその人の画面へ移るので、
 * 名前だけ入った合作の相手にすると行き先が無い）。where と order は呼ぶ側が書き、s.youtube_id の条件は付け済み
 */
const QUEUE_SELECT = `
  select s.id, s.name, s.youtube_id, to_char(s.published_on, 'YYYY-MM-DD') as published_on,
    p.id as producer_id, p.name as producer_name,
    (select coalesce(string_agg(v.name, '・' order by sv.support, v.id), '')
       from song_vocalist sv join vocalist v on v.id = sv.vocalist_id where sv.song_id = s.id) as vocalists
  from song s
  join lateral (
    select p.id, p.name from song_producer sp join producer p on p.id = sp.producer_id
    where sp.song_id = s.id order by p.complete desc, p.id limit 1
  ) p on true
  where s.youtube_id is not null`;

const toItem = (r: QueueRow): DatedItem => ({
  songId: r.id,
  title: r.name,
  videoId: r.youtube_id,
  producerId: r.producer_id,
  producerName: r.producer_name,
  vocalists: r.vocalists,
  publishedOn: r.published_on ?? '',
});

/** 日本の暦できょうの日付（YYYY-MM-DD）。ページは1時間ごとに作り直すので、日付の変わり目から1時間までずれうる */
export function today(): string {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Tokyo' }).format(new Date());
}

/**
 * きょうと同じ月日に投稿された曲。曲の少ない日は、前後の日へ1日ずつ広げて min 曲に届くまで補う（3日まで）。
 * 月日の近さは、うるう年の 2000 年に置いて測る（2月29日の曲も拾える）。並びは近い日から、同じ日の中は古い年から
 */
export const onThisDay = cache(async (date: string, min: number): Promise<DatedItem[]> => {
  const { rows } = await db().query<QueueRow & { distance: number }>(
    `select * from (
       select q.*, least(abs(d.doy - t.doy), 366 - abs(d.doy - t.doy)) as distance
       from (${QUEUE_SELECT} and s.published_on is not null) q
       cross join lateral (
         select extract(doy from make_date(2000, substr(q.published_on, 6, 2)::int, substr(q.published_on, 9, 2)::int))::int as doy
       ) d
       cross join (
         select extract(doy from make_date(2000, extract(month from $1::date)::int, extract(day from $1::date)::int))::int as doy
       ) t
     ) x
     where distance <= 3
     order by distance, published_on, id`,
    [date],
  );
  const reach = [0, 1, 2, 3].find((d) => rows.filter((r) => r.distance <= d).length >= min) ?? 3;
  return rows.filter((r) => r.distance <= reach).map(toItem);
});

/** 日替わりの無作為の並び。同じ日のうちは同じ並びになるよう、日付を混ぜた曲の id の要約で並べる */
export const dailyMix = cache(async (date: string, limit: number): Promise<DatedItem[]> => {
  const { rows } = await db().query<QueueRow>(
    `${QUEUE_SELECT} order by md5(s.id::text || $1), s.id limit $2`,
    [date, limit],
  );
  return rows.map(toItem);
});

/** 投稿された年と、その年の流せる曲の数。古い年から */
export const years = cache(async (): Promise<{ year: number; count: number }[]> => {
  const { rows } = await db().query<{ year: number; count: number }>(
    `select extract(year from published_on)::int as year, count(*)::int as count
     from song where youtube_id is not null and published_on is not null
     group by 1 order by 1`,
  );
  return rows;
});

/** その年に投稿された流せる曲。投稿の早い順 */
export const songsOfYear = cache(async (year: number): Promise<DatedItem[]> => {
  if (!Number.isSafeInteger(year)) return [];
  const { rows } = await db().query<QueueRow>(
    `${QUEUE_SELECT} and extract(year from s.published_on) = $1 order by s.published_on, s.id`,
    [year],
  );
  return rows.map(toItem);
});
