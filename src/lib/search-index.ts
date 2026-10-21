import type { QueueItem, SearchDetails, SearchIndex } from '@/lib/catalog';
import { foldLong, normalize, normalizeRomaji, score } from '@/lib/search';
import { thumbOf } from '@/lib/thumb';
import { englishTitle, type EnglishTitle } from '@/lib/english-name';

/** 検索の索引の1段目を、ブラウザで読んで探す形にする（src/lib/catalog.ts の searchIndex の説明） */

type Voice = { id: number; name: string; songCount: number; key: string };

type Producer = {
  id: number;
  name: string;
  picture: string | null;
  songCount: number;
  key: string;
  /** 英語の名前（ローマ字の名前のこともある）を探すための形。無ければ空 */
  english: string;
};

/** 1段目の索引に、探すための正規化した文字を足したもの */
export type Prepared = {
  producers: Producer[];
  /**
   * title・romaji・english は探すための形（romaji と english は、ローマ字の曲名・英語の名前が無ければ空）。
   * nth は、そのボカロPの曲の中で何番目か。2段目（ボカロPごとのファイル）の何番目を見ればよいかに使う
   */
  songs: {
    name: string;
    producer: Producer;
    nth: number;
    title: string;
    romaji: string;
    english: string;
    /** 英語の画面に出す曲名（english-name.ts） */
    en?: EnglishTitle;
  }[];
  voices: Voice[];
};

/**
 * 1段目は画面を移っても一度だけ読む。検索の画面のほか、上の段の検索欄やスマホの虫めがねを押した時点でも呼んで先に読み始める
 * （圧縮しても 500KB 近くあり、本番で読むのに 1.6 秒かかった。画面を開いてから読むと、そのあいだ「読み込んでいます」になる）
 */
let loading: Promise<Prepared> | undefined;

export function loadIndex(): Promise<Prepared> {
  const pending = (loading ??= fetch('/search-index')
    .then((res) => res.json() as Promise<SearchIndex>)
    .then(({ producers, songs, voices }): Prepared => {
      const list = producers.map(([id, name, picture, songCount, nameEn]) => ({
        id,
        name,
        picture,
        songCount,
        key: normalize(name),
        english: nameEn ? normalizeRomaji(nameEn) : '',
      }));
      const counts = new Map<number, number>();
      return {
        voices: voices.map(([id, name, songCount]) => ({
          id,
          name,
          songCount,
          key: normalize(name),
        })),
        producers: list,
        songs: songs.map(([name, at, romaji, nameEn]) => {
          const producer = list[at];
          const nth = counts.get(at) ?? 0;
          counts.set(at, nth + 1);
          return {
            name,
            producer,
            nth,
            title: normalize(name),
            romaji: romaji ? normalizeRomaji(romaji) : '',
            english: nameEn ? normalizeRomaji(nameEn) : '',
            en: englishTitle(name, nameEn ?? null, romaji ?? null),
          };
        }),
      };
    })
    .catch((error: unknown) => {
      // 読めなかったときは、次に開いたときに読み直す
      loading = undefined;
      throw error;
    }));
  return pending;
}

export type Found = {
  producers: Prepared['producers'];
  songs: Prepared['songs'];
  voices: Prepared['voices'];
};

/** 曲の当たり方の段。曲名かローマ字 → 英語の名前（多くはファンの訳）→ ボカロP名、の順に並べる（2026-10-12 に本人と決めた） */
const TIER = { title: 3, english: 2, producer: 1 };

/** 段の幅。score の最大（2）より大きくして、段が上なら当たりが弱くても上に来るようにする */
const STEP = 3;

/** 段と、段の中の当たりの強さ（score）を1つの数にする */
const ranked = (tier: number, s: number) => (s > 0 ? tier * STEP + s : 0);

/**
 * 正規化した言葉（normalize）で、1段目の索引からボカロP・曲・歌声を探す。ボカロPと歌声は当たりの強い順、同じなら曲の多い順。
 * ボカロPは英語の名前でも当てる。曲は TIER の順。同じ当たり方の中は新しい順（索引の並び）。
 * ローマ字と英語の名前は、伸ばす音の揺れをならしてから比べる（foldLong）
 */
export function findInIndex(index: Prepared, query: string): Found {
  const folded = foldLong(query);
  const producers = index.producers
    .map((p) => ({ p, s: Math.max(score(p.key, query), score(p.english, folded)) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s || b.p.songCount - a.p.songCount)
    .map((x) => x.p);
  const songs = index.songs
    .map((s) => ({
      s,
      rank:
        ranked(TIER.title, Math.max(score(s.title, query), score(s.romaji, folded))) ||
        ranked(TIER.english, score(s.english, folded)) ||
        ranked(
          TIER.producer,
          Math.max(score(s.producer.key, query), score(s.producer.english, folded)),
        ),
    }))
    .filter((x) => x.rank > 0)
    .sort((a, b) => b.rank - a.rank)
    .map((x) => x.s);
  const voices = index.voices
    .map((v) => ({ v, s: score(v.key, query) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s || b.v.songCount - a.v.songCount)
    .map((x) => x.v);
  return { producers, songs, voices };
}

/** 当たった曲を、ボカロPごとの2段目（曲の id・動画の ID・表紙・歌声）と合わせて曲の並びにする。2段目に無い曲は落とす */
export function detailsToItems(
  songs: Prepared['songs'],
  byProducer: Map<number, SearchDetails>,
): QueueItem[] {
  return songs.flatMap((s): QueueItem[] => {
    const row = byProducer.get(s.producer.id)?.[s.nth];
    if (!row) return [];
    const [songId, videoId, niconicoThumb, vocalists] = row;
    return [
      {
        songId,
        title: s.name,
        ...(s.en ? { en: s.en } : {}),
        service: niconicoThumb ? 'niconico' : 'youtube',
        videoId,
        thumb: niconicoThumb ?? thumbOf(videoId),
        producerId: s.producer.id,
        producerName: s.producer.name,
        vocalists,
      },
    ];
  });
}
