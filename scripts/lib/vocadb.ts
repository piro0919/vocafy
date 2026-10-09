import { createHash } from 'node:crypto';
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { SONG_TYPES } from './pick';

/**
 * VocaDB の API（https://vocadb.net/api）。鍵は要らない。
 * 同じ問い合わせを何度も投げないよう、返ってきた JSON は data/raw/vocadb/ に残し、MAX_AGE_DAYS 日のあいだはそれを読む。
 * 相手に負荷をかけないよう、取りに行くときは 1 秒に 1 回までにする。
 *
 * 2026-10-09 に、1日で約 4400 回（1 秒に 2 回弱で数時間）聞いたあと、VocaDB の API が 503 で1時間ほど止まった。
 * こちらが原因かは分からないが、千回を超えて聞く取り込みは、走らせる前に回数を見積もる
 */
const BASE = 'https://vocadb.net/api';
const CACHE = new URL('../../data/raw/vocadb/', import.meta.url);
const INTERVAL = 1000;
const DAY = 24 * 60 * 60 * 1000;

/**
 * 残したものを使う日数。新しく出た曲は自動の取り込み（ingest --recent）が日付で聞くので、ここを短くして拾う必要は無い。
 * 全体の取り込みを手元で走らせたとき、評価点の順位やボカロPの全曲が古くなりすぎない程度にする
 */
const MAX_AGE_DAYS = 30;

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
  /** VocaDB に登録の無い人は artist が無く、名前だけが入る */
  artist?: VdbArtist;
  name: string;
};

type VdbPv = {
  service: string;
  pvType: string;
  pvId: string;
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
    const wait = last + INTERVAL - Date.now();
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    last = Date.now();
    const res = await fetch(url, { headers: { 'User-Agent': 'Vocafy (https://vocafy.kkweb.io)' } });
    const minutes = RETRY_MINUTES[attempt];
    if ((res.status !== 429 && res.status < 500) || minutes === undefined) return res;
    console.log(`  VocaDB ${res.status}。${minutes} 分待って聞き直します`);
    await new Promise((r) => setTimeout(r, minutes * 60 * 1000));
  }
}

async function get<T>(path: string, params: Record<string, string | number | string[]>) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    for (const v of Array.isArray(value) ? value : [value]) search.append(key, String(v));
  }
  const url = `${BASE}${path}?${search}`;
  const file = new URL(`${createHash('sha1').update(url).digest('hex')}.json`, CACHE);
  try {
    if (Date.now() - (await stat(file)).mtimeMs < MAX_AGE_DAYS * DAY) {
      return JSON.parse(await readFile(file, 'utf8')) as T;
    }
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

/** 評価点の高い順に、オリジナル曲を limit 曲 */
export async function topRatedSongs(limit: number): Promise<VdbSong[]> {
  const songs: VdbSong[] = [];
  for (let start = 0; songs.length < limit; start += PAGE) {
    const { items } = await get<{ items: VdbSong[] }>('/songs', {
      ...SONG_FIELDS,
      sort: 'RatingScore',
      maxResults: PAGE,
      start,
    });
    songs.push(...items);
    if (items.length < PAGE) break;
  }
  return songs.slice(0, limit);
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

/** ニコニコの動画の ID から、その動画が登録された曲を引く。VocaDB に無ければ null */
export async function songByNiconico(videoId: string): Promise<VdbSong | null> {
  return get<VdbSong | null>('/songs/byPv', {
    fields: SONG_FIELDS.fields,
    lang: SONG_FIELDS.lang,
    pvService: 'NicoNicoDouga',
    pvId: videoId,
  });
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

type VdbVoicebank = Pick<VdbArtist, 'id' | 'name' | 'artistType'> & {
  baseVoicebank?: Pick<VdbArtist, 'id' | 'name' | 'artistType'>;
};

/**
 * 歌声の名前。VocaDB は日本語の欄に読みのカタカナを入れている歌声があり、日本語で聞くと「グミ」「カイト」「イア」のように
 * 公式（GUMI・KAITO・IA）と違う表記で返る。そこで既定の名前（lang=Default）も聞き、日本語の名前に漢字が無い
 * （カタカナやハングルの読みだけの）ときは既定の名前を使う。漢字のある名前（初音ミク・歌手不明・星尘Minus）は日本語のまま。
 * 既定の名前だけにすると、歌手不明が「Unknown vocalist(s)」、星尘Minus が「Minus」になった
 */
async function voicebank(id: number): Promise<VdbVoicebank> {
  const params = { fields: 'BaseVoicebank' };
  const ja = await get<VdbVoicebank>(`/artists/${id}`, { ...params, lang: 'Japanese' });
  if (/\p{Script=Han}/u.test(ja.name)) return ja;
  const def = await get<VdbVoicebank>(`/artists/${id}`, { ...params, lang: 'Default' });
  return { ...ja, name: def.name };
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
