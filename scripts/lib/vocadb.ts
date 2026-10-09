import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';

/**
 * VocaDB の API（https://vocadb.net/api）。鍵は要らない。
 * 同じ問い合わせを何度も投げないよう、返ってきた JSON は data/raw/vocadb/ に残し、次からはそれを読む
 * （古くなったら消して取り直す）。相手に負荷をかけないよう、取りに行くときは 1 秒に 2 回までにする
 */
const BASE = 'https://vocadb.net/api';
const CACHE = new URL('../../data/raw/vocadb/', import.meta.url);
const INTERVAL = 500;

export type VdbArtist = {
  id: number;
  name: string;
  artistType: string;
  mainPicture?: { urlOriginal?: string; urlThumb?: string };
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

async function get<T>(path: string, params: Record<string, string | number | string[]>) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    for (const v of Array.isArray(value) ? value : [value]) search.append(key, String(v));
  }
  const url = `${BASE}${path}?${search}`;
  const file = new URL(`${createHash('sha1').update(url).digest('hex')}.json`, CACHE);
  try {
    return JSON.parse(await readFile(file, 'utf8')) as T;
  } catch {
    // まだ取っていない
  }
  const wait = last + INTERVAL - Date.now();
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  last = Date.now();
  const res = await fetch(url, { headers: { 'User-Agent': 'Vocafy (https://vocafy.kkweb.io)' } });
  if (!res.ok) throw new Error(`VocaDB ${res.status}: ${url}`);
  const body = (await res.json()) as T;
  await mkdir(CACHE, { recursive: true });
  await writeFile(file, JSON.stringify(body));
  return body;
}

const SONG_FIELDS = { fields: 'Artists,Names,PVs', lang: 'Japanese', songTypes: 'Original' };
const PAGE = 50;

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

/** ニコニコの動画の ID から、その動画が登録された曲を引く。VocaDB に無ければ null */
export async function songByNiconico(videoId: string): Promise<VdbSong | null> {
  return get<VdbSong | null>('/songs/byPv', {
    fields: SONG_FIELDS.fields,
    lang: SONG_FIELDS.lang,
    pvService: 'NicoNicoDouga',
    pvId: videoId,
  });
}

/** その人が関わったオリジナル曲をすべて。作者かどうかは呼ぶ側で確かめる */
export async function songsByArtist(artistId: number): Promise<VdbSong[]> {
  const songs: VdbSong[] = [];
  for (let start = 0; ; start += PAGE) {
    const { items } = await get<{ items: VdbSong[] }>('/songs', {
      ...SONG_FIELDS,
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
  return get<VdbArtist>(`/artists/${id}`, { fields: 'MainPicture', lang: 'Japanese' });
}

type VdbVoicebank = Pick<VdbArtist, 'id' | 'name' | 'artistType'> & {
  baseVoicebank?: Pick<VdbArtist, 'id' | 'name' | 'artistType'>;
};

/**
 * 歌声の元の歌声を、根までたどる。「初音ミク V4X (Dark)」→「初音ミク V4X (Unknown)」→ … →「初音ミク」。
 * 根の歌声そのものを返す（自分が根なら自分）
 */
export async function rootVoicebank(
  id: number,
): Promise<Pick<VdbArtist, 'id' | 'name' | 'artistType'>> {
  const seen = new Set<number>();
  let current = await get<VdbVoicebank>(`/artists/${id}`, {
    fields: 'BaseVoicebank',
    lang: 'Japanese',
  });
  while (current.baseVoicebank && !seen.has(current.id)) {
    seen.add(current.id);
    current = await get<VdbVoicebank>(`/artists/${current.baseVoicebank.id}`, {
      fields: 'BaseVoicebank',
      lang: 'Japanese',
    });
  }
  return { id: current.id, name: current.name, artistType: current.artistType };
}
