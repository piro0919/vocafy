import type { SearchIndex } from '@/lib/catalog';
import { normalize, normalizeRomaji } from '@/lib/search';

/** 検索の索引の1段目を、ブラウザで読んで探す形にする（src/lib/catalog.ts の searchIndex の説明） */

type Voice = { id: number; name: string; songCount: number; key: string };

type Producer = {
  id: number;
  name: string;
  picture: string | null;
  songCount: number;
  key: string;
};

/** 1段目の索引に、探すための正規化した文字を足したもの */
export type Prepared = {
  producers: Producer[];
  /**
   * title と romaji は探すための形（romaji はローマ字の曲名が無ければ空）。nth は、そのボカロPの曲の中で何番目か。
   * 2段目（ボカロPごとのファイル）の何番目を見ればよいかに使う
   */
  songs: { name: string; producer: Producer; nth: number; title: string; romaji: string }[];
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
      const list = producers.map(([id, name, picture, songCount]) => ({
        id,
        name,
        picture,
        songCount,
        key: normalize(name),
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
        songs: songs.map(([name, at, romaji]) => {
          const producer = list[at];
          const nth = counts.get(at) ?? 0;
          counts.set(at, nth + 1);
          return {
            name,
            producer,
            nth,
            title: normalize(name),
            romaji: romaji ? normalizeRomaji(romaji) : '',
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
