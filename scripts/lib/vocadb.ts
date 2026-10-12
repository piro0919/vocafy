import { createHash } from 'node:crypto';
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { today } from '../../src/lib/iso-date';
import { SONG_TYPES } from './pick';

/**
 * VocaDB の API（https://vocadb.net/api）。鍵は要らない。
 * 同じ問い合わせを何度も投げないよう、返ってきた JSON は data/raw/vocadb/ に残し、MAX_AGE_DAYS 日のあいだはそれを読む。
 * 相手に負荷をかけないよう、取りに行くときは 1 秒に 1 回までにする。
 *
 * 2026-10-09 に、1日で約 4400 回（1 秒に 2 回弱で数時間）聞いたあと、VocaDB の API が 503 で1時間ほど止まった。
 * こちらが原因かは分からない
 */
const BASE = 'https://vocadb.net/api';
const CACHE = new URL('../../data/raw/vocadb/', import.meta.url);
const INTERVAL = 1000;
const DAY = 24 * 60 * 60 * 1000;

/**
 * 1日に VocaDB へ聞く回数の上限。VocaDB は「事前の許可なく1日に数千回聞くと DoS 攻撃とみなし、IP を締め出すことがある」
 * としている（https://wiki.vocadb.net/docs/public-api の API usage rules）。2026-10-12 に本人と決めた値で、数千回を確実に下回る。
 * 達したら取り込みを止める。返事は控えに残っているので、次の日に同じコマンドを走らせれば続きから進む。
 * 数えるのは控えを読んだ分を除いた、実際に聞いた回数（聞き直しも含む）。日付は日本の暦
 */
export const DAILY_LIMIT = 750;
const COUNT = new URL('../../data/raw/vocadb-count.json', import.meta.url);

export class DailyLimitError extends Error {
  constructor() {
    super(
      `VocaDB にきょう聞ける回数（${DAILY_LIMIT} 回）に達したので止めます。明日同じコマンドを走らせると、控えを使って続きから進みます`,
    );
  }
}

/** 次の1回を聞いてよければ数え、上限に達していれば DailyLimitError。数はファイルに残し、同じ日のほかの実行とも合わせる */
async function countRequest() {
  const date = today();
  let count = 0;
  try {
    const saved = JSON.parse(await readFile(COUNT, 'utf8')) as { date: string; count: number };
    if (saved.date === date) count = saved.count;
  } catch {
    // まだ聞いていない
  }
  if (count >= DAILY_LIMIT) throw new DailyLimitError();
  await mkdir(new URL('.', COUNT), { recursive: true });
  await writeFile(COUNT, JSON.stringify({ date, count: count + 1 }));
}

/**
 * 残したものを使う日数。新しく出た曲は自動の取り込み（ingest --recent）が日付で聞くので、ここを短くして拾う必要は無い。
 * 全体の取り込みを手元で走らせたとき、評価点の順位やボカロPの全曲が古くなりすぎない程度にする
 */
const MAX_AGE_DAYS = 30;

/**
 * 中身が変わらない返事（動画と曲の対応・歌声の名前と元の歌声）を使う日数。全体の取り込みが聞く回数の半分ほどがこれで、
 * 30日ごとに聞き直すと1日の上限（DAILY_LIMIT）の何日分にもなる。VocaDB で直されたら、その控えのファイルを消せば聞き直す
 */
const STABLE_DAYS = 365;

export type VdbArtist = {
  id: number;
  name: string;
  artistType: string;
  mainPicture?: { urlOriginal?: string; urlThumb?: string };
  webLinks?: VdbWebLink[];
};

export type VdbWebLink = {
  /** Official（本人の場所）・Commercial（買える・聴ける場所）・Reference（第三者の解説）など */
  category: string;
  description: string;
  url: string;
  /** 閉じたなどで使えなくなったリンク */
  disabled: boolean;
};

type VdbSongArtist = {
  /** 「Producer, Illustrator」のようにカンマ区切り */
  categories: string;
  isSupport: boolean;
  /** 「Composer, Lyricist」のようにカンマ区切り。Default はその分類の既定の役割（Producer なら作曲など） */
  effectiveRoles?: string;
  /** VocaDB に登録の無い人は artist が無く、名前だけが入る */
  artist?: VdbArtist;
  name: string;
};

type VdbPv = {
  service: string;
  pvType: string;
  pvId: string;
  /** 上げたチャンネルの名前。YouTube が配信の音源から自動で作った動画は「〇〇 - Topic」 */
  author?: string;
  /** 表紙の画像。ニコニコは動画の ID から組み立てられないので、これを使う */
  thumbUrl?: string;
  disabled?: boolean;
};

export type VdbSong = {
  id: number;
  name: string;
  /** ほかの言語の曲名。漢字の曲名の読みを、ローマ字（Romaji）の名前から取る */
  names?: { language: string; value: string }[];
  songType: string;
  /** 出し直しの版（リマスター・リミックス・PV 版）の、元の曲の番号 */
  originalVersionId?: number;
  publishDate?: string;
  ratingScore: number;
  favoritedTimes: number;
  artists?: VdbSongArtist[];
  pvs?: VdbPv[];
};

let last = 0;

/**
 * VocaDB の API は一時的に 503 を返して止まることがある（2026-10-09 に、自動の取り込みの初回がこれで落ちた。
 * そのときトップのページは 200 を返していた）。取り込みは人の目を通さずに回るので、混み合いと止まっているときは
 * 1分・2分・4分・8分と待って聞き直す。それでも駄目なら落とし、次の回に任せる
 */
const RETRY_MINUTES = [1, 2, 4, 8];

async function fetchWithRetry(url: string): Promise<Response> {
  for (let attempt = 0; ; attempt++) {
    await countRequest();
    const wait = last + INTERVAL - Date.now();
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    last = Date.now();
    const minutes = RETRY_MINUTES[attempt];
    // つながらなかったとき（接続が切れた・名前を引けない）も、混み合いと同じく待って聞き直す。前はそのまま落ちていた
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Vocafy (https://vocafy.kkweb.io)' },
    }).catch((error: unknown) => {
      if (minutes === undefined) throw error;
      return null;
    });
    if (res && ((res.status !== 429 && res.status < 500) || minutes === undefined)) return res;
    console.log(`  VocaDB ${res?.status ?? 'につながりません'}。${minutes} 分待って聞き直します`);
    await new Promise((r) => setTimeout(r, minutes * 60 * 1000));
  }
}

/** 控えを使う日数。返事の中身で変えるときは関数で渡す */
type MaxAge<T> = number | ((body: T) => number);

async function get<T>(
  path: string,
  params: Record<string, string | number | string[]>,
  maxAge: MaxAge<T> = MAX_AGE_DAYS,
) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    for (const v of Array.isArray(value) ? value : [value]) search.append(key, String(v));
  }
  const url = `${BASE}${path}?${search}`;
  const file = new URL(`${createHash('sha1').update(url).digest('hex')}.json`, CACHE);
  try {
    const age = Date.now() - (await stat(file)).mtimeMs;
    const body = JSON.parse(await readFile(file, 'utf8')) as T;
    if (age < (typeof maxAge === 'number' ? maxAge : maxAge(body)) * DAY) return body;
  } catch {
    // まだ取っていない
  }
  const res = await fetchWithRetry(url);
  if (!res.ok) throw new Error(`VocaDB ${res.status}: ${url}`);
  const body = (await res.json()) as T;
  await mkdir(CACHE, { recursive: true });
  await writeFile(file, JSON.stringify(body));
  return body;
}

/** 種の線（評価点・YouTube の再生数）はオリジナル曲だけで選ぶ。ボカロPの曲と新しく出た曲は出し直しの版も聞く（SONG_TYPES） */
const SONG_FIELDS = { fields: 'Artists,Names,PVs', lang: 'Japanese', songTypes: 'Original' };
const ALL_TYPES = { ...SONG_FIELDS, songTypes: SONG_TYPES.join(',') };
/** 1回で返る曲の数。VocaDB の上限が 100（2026-10-09 に 200 を頼んで 100 が返るのを確かめた）。前は 50 で、聞く回数が倍だった */
const PAGE = 100;

/**
 * 評価点の高い順に、オリジナル曲を limit 曲。VocaDB は評価点の同じ曲の順を固定しないので、評価点の順でページを送ると、
 * 境目の同点の曲が両方のページに出たり、どちらにも出なかったりする（2026-10-12 に、評価点 559 の「シニタイちゃん」が
 * 2ページ目と3ページ目のどちらにも無く、それが唯一の種だった すいっち が外れていた）。そこで評価点の順では limit 番目の
 * 点数だけを読み、その点数以上の曲を、順の崩れない投稿日の順で取り直して、手元で並べる
 */
export async function topRatedSongs(limit: number): Promise<VdbSong[]> {
  const { items: edge } = await get<{ items: VdbSong[] }>('/songs', {
    ...SONG_FIELDS,
    sort: 'RatingScore',
    maxResults: 1,
    start: limit - 1,
  });
  const minScore = edge[0]?.ratingScore ?? 0;
  const songs = new Map<number, VdbSong>();
  for (let start = 0; ; start += PAGE) {
    const { items } = await get<{ items: VdbSong[] }>('/songs', {
      ...SONG_FIELDS,
      minScore,
      sort: 'PublishDate',
      maxResults: PAGE,
      start,
    });
    for (const s of items) songs.set(s.id, s);
    if (items.length < PAGE) break;
  }
  return [...songs.values()]
    .sort((a, b) => b.ratingScore - a.ratingScore || a.id - b.id)
    .slice(0, limit);
}

/**
 * YouTube の再生数の線の候補。after より後に出た、YouTube に動画のあるオリジナル曲のうち、評価点が minScore 以上のもの。
 * 評価点の上位だけでは、YouTube で聴かれていても VocaDB で票の少ない最近の曲を拾えないので、広めに取って再生数で選ぶ
 */
export async function youtubeCandidates(after: string, minScore: number): Promise<VdbSong[]> {
  const songs: VdbSong[] = [];
  for (let start = 0; ; start += PAGE) {
    const { items } = await get<{ items: VdbSong[] }>('/songs', {
      ...SONG_FIELDS,
      pvServices: 'Youtube',
      afterDate: after,
      minScore,
      sort: 'PublishDate',
      maxResults: PAGE,
      start,
    });
    songs.push(...items);
    if (songs.length % 2000 < PAGE) console.log(`  候補 ${songs.length} 曲`);
    if (items.length < PAGE) return songs;
  }
}

/** after より後に出たオリジナル曲と出し直しの版をすべて。新しく出た曲を足すだけの取り込み（ingest --recent）が使う */
export async function songsPublishedAfter(after: string): Promise<VdbSong[]> {
  const songs: VdbSong[] = [];
  for (let start = 0; ; start += PAGE) {
    const { items } = await get<{ items: VdbSong[] }>('/songs', {
      ...ALL_TYPES,
      afterDate: after,
      sort: 'PublishDate',
      maxResults: PAGE,
      start,
    });
    songs.push(...items);
    if (items.length < PAGE) return songs;
  }
}

/**
 * ニコニコの動画の ID から、その動画が登録された曲を引く。VocaDB に無ければ null。
 * 動画と曲の対応は変わらないので長く残す。無かった返事だけは、あとから登録されたときに拾えるよう30日で聞き直す
 */
export async function songByNiconico(videoId: string): Promise<VdbSong | null> {
  return get<VdbSong | null>(
    '/songs/byPv',
    {
      fields: SONG_FIELDS.fields,
      lang: SONG_FIELDS.lang,
      pvService: 'NicoNicoDouga',
      pvId: videoId,
    },
    (song) => (song ? STABLE_DAYS : MAX_AGE_DAYS),
  );
}

/** その人が関わったオリジナル曲と出し直しの版をすべて。作者かどうかは呼ぶ側で確かめる */
export async function songsByArtist(artistId: number): Promise<VdbSong[]> {
  const songs: VdbSong[] = [];
  for (let start = 0; ; start += PAGE) {
    const { items } = await get<{ items: VdbSong[] }>('/songs', {
      ...ALL_TYPES,
      'artistId[]': artistId,
      sort: 'PublishDate',
      maxResults: PAGE,
      start,
    });
    songs.push(...items);
    if (items.length < PAGE) return songs;
  }
}

export async function artist(id: number): Promise<VdbArtist> {
  return get<VdbArtist>(`/artists/${id}`, { fields: 'MainPicture,WebLinks', lang: 'Japanese' });
}

/**
 * ボカロPのほかの言語の名前（English・Romaji など）。英語の画面に出す名前を選ぶ（scripts/lib/song-names.ts の fillEnglishProducerNames）。
 * artist と別に聞くのは、artist の問い合わせを変えると、残してある全員分の控えが使えず聞き直しになるため
 */
export async function artistNames(id: number): Promise<{ language: string; value: string }[]> {
  return (
    (
      await get<{ names?: { language: string; value: string }[] }>(`/artists/${id}`, {
        fields: 'Names',
      })
    ).names ?? []
  );
}

type VdbVoicebank = Pick<VdbArtist, 'id' | 'name' | 'artistType'> & {
  baseVoicebank?: Pick<VdbArtist, 'id' | 'name' | 'artistType'>;
};

/**
 * 歌声の名前。VocaDB は日本語の欄に読みのカタカナを入れている歌声があり、日本語で聞くと「グミ」「カイト」「イア」のように
 * 公式（GUMI・KAITO・IA）と違う表記で返る。そこで既定の名前（lang=Default）も聞き、日本語の名前に漢字が無い
 * （カタカナやハングルの読みだけの）ときは既定の名前を使う。漢字のある名前（初音ミク・歌手不明・星尘Minus）は日本語のまま。
 * 既定の名前だけにすると、歌手不明が「Unknown vocalist(s)」、星尘Minus が「Minus」になった。
 * 歌声の名前と元の歌声はまず変わらないので長く残す
 */
async function voicebank(id: number): Promise<VdbVoicebank> {
  const params = { fields: 'BaseVoicebank' };
  const ja = await get<VdbVoicebank>(
    `/artists/${id}`,
    { ...params, lang: 'Japanese' },
    STABLE_DAYS,
  );
  if (/\p{Script=Han}/u.test(ja.name)) return ja;
  const def = await get<VdbVoicebank>(
    `/artists/${id}`,
    { ...params, lang: 'Default' },
    STABLE_DAYS,
  );
  return { ...ja, name: def.name };
}

/**
 * 歌声の英語の名前（lang=English）。英語の画面で、日本語の名前の代わりに出す（scripts/voice-names.ts）。
 * 英語の名前の無い歌声は、VocaDB が既定の名前を返す
 */
export async function voicebankEnglishName(id: number): Promise<string> {
  return (await get<VdbVoicebank>(`/artists/${id}`, { lang: 'English' })).name;
}

/**
 * 歌声の元の歌声を、根までたどる。「初音ミク V4X (Dark)」→「初音ミク V4X (Unknown)」→ … →「初音ミク」。
 * 自分と根の歌声を返す（自分が根なら同じもの）。名前は voicebank の決め方による
 */
export async function rootVoicebank(id: number): Promise<{
  self: Pick<VdbArtist, 'id' | 'name' | 'artistType'>;
  root: Pick<VdbArtist, 'id' | 'name' | 'artistType'>;
}> {
  const pick = ({ id, name, artistType }: VdbVoicebank) => ({ id, name, artistType });
  const seen = new Set<number>();
  const self = await voicebank(id);
  let current = self;
  while (current.baseVoicebank && !seen.has(current.id)) {
    seen.add(current.id);
    current = await voicebank(current.baseVoicebank.id);
  }
  return { self: pick(self), root: pick(current) };
}
