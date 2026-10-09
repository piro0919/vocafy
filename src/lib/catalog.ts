// DB を読むのはサーバーだけ。ブラウザ側の部品から値として読み込むとビルドで止まるよう、サーバー専用にする（型だけの読み込みは構わない）
import 'server-only';
import pg from 'pg';
import { cache } from 'react';
import { env } from '@/env';
import { thumbOf } from './thumb';

// 正本は VocaDB。DB の中身は scripts/ingest.ts が取り込んだもので、手で直さない

/** 再生の順番待ちに積む1曲。どのボカロPの画面から流したかを持ち、プレイヤーの帯に出す */
export type QueueItem = {
  songId: number;
  title: string;
  /** 流す先。YouTube が基本で、YouTube に本家が無い曲だけニコニコ（補欠） */
  service: 'youtube' | 'niconico';
  /** service の側の動画の ID（YouTube の動画の ID か、ニコニコの sm… / so…） */
  videoId: string;
  /** 表紙の画像 */
  thumb: string;
  producerId: number;
  producerName: string;
  /** 歌声の名前を「・」でつないだもの */
  vocalists: string;
};

/** 一覧に出す1曲。ニコニコにしか本家が無い曲は youtubeId が null で、ニコニコで流す */
export type Song = {
  id: number;
  title: string;
  youtubeId: string | null;
  niconicoId: string | null;
  niconicoThumb: string | null;
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
  niconico_thumb: string | null;
  year: number | null;
  producers: { id: number; name: string }[];
  vocalists: string[];
};

/** 曲に、作者と歌声（補助の歌声は後ろ）を付けて読む。where と order は呼ぶ側が書く */
const SONG_SELECT = `
  select s.id, s.name, s.youtube_id, s.niconico_id, s.niconico_thumb,
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
  niconicoThumb: r.niconico_thumb,
  year: r.year,
  producers: r.producers,
  vocalists: r.vocalists,
});

/**
 * 流す先と表紙。YouTube に本家があればそちら、無ければニコニコ。
 * ニコニコの表紙は、VocaDB の持つ住所が小さい絵（130×100 ほど）なので、末尾に番号の付いた新しい住所は
 * .M を足して中くらいの絵（320×180）にする。番号の無い古い住所は .M を受け付けないので、そのまま使う。
 * どちらも流せない（ニコニコの表紙が取れていない）曲は null
 */
function sourceOf(
  youtubeId: string | null,
  niconicoId: string | null,
  niconicoThumb: string | null,
): Pick<QueueItem, 'service' | 'videoId' | 'thumb'> | null {
  if (youtubeId) return { service: 'youtube', videoId: youtubeId, thumb: thumbOf(youtubeId) };
  if (niconicoId && niconicoThumb) {
    const thumb = /\/\d+\.\d+$/.test(niconicoThumb) ? `${niconicoThumb}.M` : niconicoThumb;
    return { service: 'niconico', videoId: niconicoId, thumb };
  }
  return null;
}

/** 曲を順番待ちの形にする。producer は、どのボカロPの画面で流すか。流せない曲は外す */
export function queueOf(songs: Song[], producer?: { id: number; name: string }): QueueItem[] {
  return songs.flatMap((s) => {
    const by = producer ?? s.producers[0];
    const source = sourceOf(s.youtubeId, s.niconicoId, s.niconicoThumb);
    return source && by
      ? [
          {
            songId: s.id,
            title: s.title,
            ...source,
            producerId: by.id,
            producerName: by.name,
            vocalists: s.vocalists.join('・'),
          },
        ]
      : [];
  });
}

/** 一覧に出すボカロP（全曲を取り込んだ人）。最近曲を出した人から（人気の順にはしない） */
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
    order by max(s.published_on) desc nulls last, p.id`);
  return rows.map((r) => ({ id: r.id, name: r.name, picture: r.picture, songCount: r.song_count }));
});

/** ボカロPと、その人の曲（新しい順）。合作の相手として名前だけ入った人は出さない */
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
       order by s.published_on desc nulls last, s.id`,
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

/** 流せる曲の条件。表は s */
const PLAYABLE = '(s.youtube_id is not null or s.niconico_thumb is not null)';

type QueueRow = {
  id: number;
  name: string;
  youtube_id: string | null;
  niconico_id: string | null;
  niconico_thumb: string | null;
  published_on: string | null;
  rating_score: number;
  producer_id: number;
  producer_name: string;
  vocalists: string;
};

/**
 * 流せる曲を、順番待ちの形で読む。作者は全曲を取り込んだ人を先にして1人だけ付ける（押すとその人の画面へ移るので、
 * 名前だけ入った合作の相手にすると行き先が無い）。where と order は呼ぶ側が書き、流せるかの条件は付け済み
 * （YouTube に本家があるか、ニコニコに本家があって表紙が取れている曲。PLAYABLE）
 */
const QUEUE_SELECT = `
  select s.id, s.name, s.youtube_id, s.niconico_id, s.niconico_thumb,
    to_char(s.published_on, 'YYYY-MM-DD') as published_on, s.rating_score,
    p.id as producer_id, p.name as producer_name,
    (select coalesce(string_agg(v.name, '・' order by sv.support, v.id), '')
       from song_vocalist sv join vocalist v on v.id = sv.vocalist_id where sv.song_id = s.id) as vocalists
  from song s
  join lateral (
    select p.id, p.name from song_producer sp join producer p on p.id = sp.producer_id
    where sp.song_id = s.id order by p.complete desc, p.id limit 1
  ) p on true
  where ${PLAYABLE}`;

const toItem = (r: QueueRow): DatedItem => ({
  songId: r.id,
  title: r.name,
  // QUEUE_SELECT は流せる曲だけを読むので、流す先は必ず決まる
  ...sourceOf(r.youtube_id, r.niconico_id, r.niconico_thumb)!,
  producerId: r.producer_id,
  producerName: r.producer_name,
  vocalists: r.vocalists,
  publishedOn: r.published_on ?? '',
});

/** 日本の暦できょうの日付（YYYY-MM-DD）。ページは1時間ごとに作り直すので、日付の変わり目から1時間までずれうる */
export function today(): string {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Tokyo' }).format(new Date());
}

/** 文字列から決まる 0 以上の整数。日ごとに決まった選び方をするのに使う */
function hash(text: string): number {
  let h = 0;
  for (const c of text) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h;
}

/**
 * きょうと同じ月日に投稿された曲。曲の少ない日は、前後の日へ1日ずつ広げて min 曲に届くまで補う（3日まで）。
 * 月日の近さは、うるう年の 2000 年に置いて測る（2月29日の曲も拾える）。並びは近い日から、同じ日の中は新しい年から。
 *
 * 大きく見せる1曲（hero）は、きょうと同じ月日の曲のうち評価点の上位3曲から、日ごとに決まった1曲を選ぶ。
 * 順位は画面に出さないが、初めて来た人が知っている曲に出会いやすいよう、選び方にだけ人気を混ぜる（2026-10-09 に決めた）
 */
export const onThisDay = cache(
  async (date: string, min: number): Promise<{ hero?: DatedItem; rest: DatedItem[] }> => {
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
     order by distance, published_on desc, id`,
      [date],
    );
    const reach = [0, 1, 2, 3].find((d) => rows.filter((r) => r.distance <= d).length >= min) ?? 3;
    const within = rows.filter((r) => r.distance <= reach);
    const exact = within.filter((r) => r.distance === 0);
    const candidates = (exact.length > 0 ? exact : within)
      .toSorted((a, b) => b.rating_score - a.rating_score || a.id - b.id)
      .slice(0, 3);
    const hero = candidates[hash(date) % Math.max(1, candidates.length)];
    return {
      hero: hero && toItem(hero),
      rest: within.filter((r) => r !== hero).map(toItem),
    };
  },
);

/**
 * 日替わりの並びに混ぜる、評価点の上位の曲の数と、その上位の範囲。
 * 18 曲のうち 5 曲（4分の1ほど）。混ぜすぎると、いつも同じ有名曲が出てフラットの建前が崩れる
 */
const MIX_POPULAR = 5;
const MIX_POPULAR_POOL = 500;

/**
 * 日替わりの無作為の並び。同じ日のうちは同じ並びになるよう、日付を混ぜた曲の id の要約で選んで並べる。
 * limit 曲のうち MIX_POPULAR 曲は評価点の上位 MIX_POPULAR_POOL 曲から、残りは全曲から選び、混ぜて並べる。
 * 順位は画面に出さず、選び方にだけ人気を混ぜる（2026-10-09 に決めた）。上位の範囲を広く取るので、同じ有名曲が毎日は出ない
 */
export const dailyMix = cache(async (date: string, limit: number): Promise<DatedItem[]> => {
  const popular = await db().query<QueueRow>(
    `${QUEUE_SELECT} and s.id in (
       select p.id from song p
       where p.youtube_id is not null or p.niconico_thumb is not null
       order by p.rating_score desc, p.id limit $2)
     order by md5(s.id::text || $1), s.id limit $3`,
    [date, MIX_POPULAR_POOL, MIX_POPULAR],
  );
  const picked = popular.rows.map((r) => r.id);
  const rest = await db().query<QueueRow>(
    `${QUEUE_SELECT} and not (s.id = any($2::int[])) order by md5(s.id::text || $1), s.id limit $3`,
    [date, picked, limit - picked.length],
  );
  return [...popular.rows, ...rest.rows]
    .toSorted((a, b) => hash(`${date}${a.id}`) - hash(`${date}${b.id}`))
    .map(toItem);
});

/** 投稿された年と、その年の流せる曲の数。新しい年から */
export const years = cache(async (): Promise<{ year: number; count: number }[]> => {
  const { rows } = await db().query<{ year: number; count: number }>(
    `select extract(year from s.published_on)::int as year, count(*)::int as count
     from song s where ${PLAYABLE} and s.published_on is not null
     group by 1 order by 1 desc`,
  );
  return rows;
});

/** 一覧の1ページの曲数。数千曲を1枚に並べると、ページが数 MB になって重い */
export const PAGE_SIZE = 300;

/** 一覧の1ページと、全体の曲数。ページが範囲の外なら songs は空で total は 0 */
export type Paged = { songs: DatedItem[]; total: number };

/**
 * 流せる曲の一覧を、page ページ目（1 から）だけ読む。where は QUEUE_SELECT に続ける条件、
 * order は q（QUEUE_SELECT の結果）の列で書く。params の後ろに、件数と読み飛ばす数を足して渡す
 */
async function paged(
  where: string,
  order: string,
  params: unknown[],
  page: number,
): Promise<Paged> {
  if (!Number.isSafeInteger(page) || page < 1) return { songs: [], total: 0 };
  const n = params.length;
  const { rows } = await db().query<QueueRow & { total: number }>(
    `select q.*, count(*) over ()::int as total from (${QUEUE_SELECT} ${where}) q
     order by ${order} limit $${n + 1} offset $${n + 2}`,
    [...params, PAGE_SIZE, (page - 1) * PAGE_SIZE],
  );
  return { songs: rows.map(toItem), total: rows[0]?.total ?? 0 };
}

/** その年に投稿された流せる曲。新しい順 */
export const songsOfYear = cache(async (year: number, page: number): Promise<Paged> => {
  if (!Number.isSafeInteger(year)) return { songs: [], total: 0 };
  return paged(
    'and extract(year from s.published_on) = $1',
    'q.published_on desc, q.id',
    [year],
    page,
  );
});

/** 月日（MM-DD）。2月29日も含む。日付として無い月日（02-31 など）は通るが、曲が無いので空になる */
const MONTH_DAY = /^(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

/** その月日（MM-DD）に投稿された流せる曲。どの年の曲も含めて、新しい順 */
export const songsOfDay = cache(async (monthDay: string, page: number): Promise<Paged> => {
  if (!MONTH_DAY.test(monthDay)) return { songs: [], total: 0 };
  return paged(
    "and to_char(s.published_on, 'MM-DD') = $1",
    'q.published_on desc, q.id',
    [monthDay],
    page,
  );
});

export type Voice = { id: number; name: string; songCount: number };

/** キャラごとにまとめた歌声の id（元の歌声の id）。取り込む前の行は base_id が null なので、自分を根として扱う */
const VOICE_OF = 'coalesce(v.base_id, v.id)';

/**
 * 歌声をキャラごとにまとめ、主に歌っている（補助ではない）流せる曲の多い順に。
 * VocaDB は、エンジンの違う版（重音テトの UTAU 版と Synthesizer V 版など）を「重音テト (Unknown)」という根でまとめる。
 * 名前の「 (Unknown)」は画面に出さない
 */
export const voices = cache(async (): Promise<Voice[]> => {
  const { rows } = await db().query<Voice>(
    `select b.id, regexp_replace(b.name, ' \\(Unknown\\)$', '') as name,
       count(distinct s.id)::int as "songCount"
     from vocalist v
     join vocalist b on b.id = ${VOICE_OF}
     join song_vocalist sv on sv.vocalist_id = v.id and not sv.support
     join song s on s.id = sv.song_id and ${PLAYABLE}
     group by b.id
     order by 3 desc, b.id`,
  );
  return rows;
});

/** その歌声（キャラ）が主に歌っている流せる曲。新しい順 */
export const findVoice = cache(
  async (id: number, page: number): Promise<({ voice: Voice } & Paged) | undefined> => {
    if (!Number.isSafeInteger(id)) return;
    const voice = (await voices()).find((v) => v.id === id);
    if (!voice) return;
    const found = await paged(
      `and exists (
         select 1 from song_vocalist sv join vocalist v on v.id = sv.vocalist_id
         where sv.song_id = s.id and not sv.support and ${VOICE_OF} = $1)`,
      'q.published_on desc nulls last, q.id',
      [id],
      page,
    );
    return { voice, ...found };
  },
);

/** 索引の行ごとの、流せる曲の数 */
export const kanaRows = cache(async (): Promise<Map<string, number>> => {
  const { rows } = await db().query<{ row: string; count: number }>(
    `select s.kana_row as row, count(*)::int as count
     from song s where ${PLAYABLE} and s.kana_row is not null group by 1`,
  );
  return new Map(rows.map((r) => [r.row, r.count]));
});

/** その行で始まる流せる曲。曲名の順 */
export const songsOfRow = cache(async (row: string, page: number): Promise<Paged> =>
  paged('and s.kana_row = $1', 'q.name, q.id', [row], page),
);

/**
 * 検索の索引。全曲の曲名とボカロP名を、配備のときに1つにまとめて配る（src/app/search-index/route.ts）。
 * 検索のたびに DB を読むと、無料プランの計算時間を食う（DB は最後に読まれてから5分動き続ける）ので、
 * 探すのはブラウザの中でする。大きさを抑えるため、値は配列に詰め、ボカロPは番号で引く。
 * 曲は新しい順。曲の作者は、全曲を取り込んだ人を先にして1人だけ（QUEUE_SELECT と同じ）
 */
export type SearchIndex = {
  /** [id, 名前, 画像, 曲数] */
  producers: [number, string, string | null, number][];
  /**
   * [id, 曲名, producers の何番目か, 流す先の動画の ID, ニコニコの表紙（YouTube の曲は null）, 曲名のローマ字（無ければ null）]
   */
  songs: [number, string, number, string, string | null, string | null][];
};

export const searchIndex = cache(async (): Promise<SearchIndex> => {
  const list = await producers();
  const at = new Map(list.map((p, i) => [p.id, i]));
  const { rows } = await db().query<{
    id: number;
    name: string;
    youtube_id: string | null;
    niconico_id: string | null;
    niconico_thumb: string | null;
    romaji: string | null;
    producer_id: number;
  }>(
    `select s.id, s.name, s.youtube_id, s.niconico_id, s.niconico_thumb, s.romaji, p.id as producer_id
     from song s
     join lateral (
       select p.id from song_producer sp join producer p on p.id = sp.producer_id
       where sp.song_id = s.id order by p.complete desc, p.id limit 1
     ) p on true
     where ${PLAYABLE}
     order by s.published_on desc nulls last, s.id`,
  );
  return {
    producers: list.map((p) => [p.id, p.name, p.picture, p.songCount]),
    songs: rows.flatMap((r) => {
      const i = at.get(r.producer_id);
      const source = sourceOf(r.youtube_id, r.niconico_id, r.niconico_thumb);
      if (i === undefined || !source) return [];
      return [
        [
          r.id,
          r.name,
          i,
          source.videoId,
          source.service === 'niconico' ? source.thumb : null,
          r.romaji,
        ],
      ];
    }),
  };
});

/** VocaDB の関連曲の返事。3種類とも12曲ずつ */
type VdbRelated = Record<'artistMatches' | 'likeMatches' | 'tagMatches', { id: number }[]>;

/** VocaDB に聞いた関連曲を作り置きする長さ（秒）。関連曲は投票やタグで少しずつしか変わらない */
const RELATED_TTL = 60 * 60 * 24 * 7;

/**
 * その曲の関連曲のうち、このサイトで流せるもの。ラジオ（押した曲から関連曲を流し続ける再生）に使う。
 * VocaDB の「好きな人が好きな曲」「タグが近い曲」「同じ作者」を1曲ずつ順に混ぜる（同じ作者ばかり続かないように）。
 * VocaDB に聞けなかったときは空にする（ラジオはそこで足すのをやめるだけ）
 */
export async function relatedSongs(songId: number): Promise<QueueItem[]> {
  if (!Number.isSafeInteger(songId)) return [];
  let related: VdbRelated;
  try {
    const res = await fetch(`https://vocadb.net/api/songs/${songId}/related`, {
      headers: { 'User-Agent': 'Vocafy (https://vocafy.kkweb.io)' },
      next: { revalidate: RELATED_TTL },
    });
    if (!res.ok) return [];
    related = (await res.json()) as VdbRelated;
  } catch {
    return [];
  }
  const lists = [related.likeMatches, related.tagMatches, related.artistMatches].map(
    (l) => l ?? [],
  );
  const ids: number[] = [];
  for (let i = 0; i < Math.max(...lists.map((l) => l.length)); i++) {
    for (const l of lists) if (l[i] && !ids.includes(l[i].id)) ids.push(l[i].id);
  }
  if (ids.length === 0) return [];
  const { rows } = await db().query<QueueRow>(`${QUEUE_SELECT} and s.id = any($1)`, [ids]);
  const byId = new Map(rows.map((r) => [r.id, r]));
  return ids.flatMap((id) => {
    const r = byId.get(id);
    return r ? [toItem(r)] : [];
  });
}
