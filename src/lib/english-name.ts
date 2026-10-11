/**
 * 英語の画面に出す曲名（2026-10-12 に本人と決めた）。名前の出どころは VocaDB だけ（取り込みが song.name_en・song.romaji に入れる）。
 * - 片仮名と英字だけの曲名（ワールドイズマイン）は、英語の名前（World is Mine）。英語の名前はほぼ同じ綴りなので
 * - 漢字やひらがなを含む曲名（千本桜）は、ローマ字（Senbonzakura）を主にし、英語の訳（A Thousand Cherry Blossoms）を添える。
 *   英語の名前の多くはファンの訳で、海外のファンもローマ字で呼ぶことが多いため
 * - 片方しか無ければある方。どちらも無ければ、英語の画面でも日本語のまま
 * 日本語の曲名は、埋め込みの動画の題名と同じ曲だと分かるよう、英語の画面でもいつも小さく添える（出す側が決める）
 */
export type EnglishTitle = {
  /** 主に出す名前 */
  main: string;
  /** 小さく添える英語の訳。ローマ字を主にしたときだけ */
  sub?: string;
};

/** 画面に出す曲名。main を主に出し、sub（英語の訳）と ja（日本語の曲名）を小さく添える。日本語の画面は main だけ */
export type DisplayTitle = { main: string; sub?: string; ja?: string };

/** 曲名をその画面の言語で出す形にする。英語の名前の無い曲は英語の画面でも日本語のまま */
export function displayTitle(
  song: { title: string; en?: EnglishTitle },
  lang: 'ja' | 'en',
): DisplayTitle {
  if (lang === 'ja' || !song.en) return { main: song.title };
  return { main: song.en.main, sub: song.en.sub, ja: song.title };
}

/** 日本語の字（かな・漢字）を含む曲名。英字だけの曲名は英語の画面でもそのまま出す */
const JAPANESE = /[ぁ-んァ-ヶ一-龠々]/;
/** ひらがなか漢字を含む曲名。片仮名と英字だけの曲名と分ける */
const KANJI_OR_HIRAGANA = /[ぁ-ん一-龠々]/;

/** 英語の画面に出す曲名。日本語の字を含まない曲名と、英語の名前もローマ字も無い曲名は undefined（そのまま出す） */
export function englishTitle(
  name: string,
  nameEn: string | null,
  romaji: string | null,
): EnglishTitle | undefined {
  if (!JAPANESE.test(name)) return undefined;
  if (!KANJI_OR_HIRAGANA.test(name)) {
    const main = nameEn ?? romaji;
    return main ? { main } : undefined;
  }
  if (romaji) return nameEn && nameEn !== romaji ? { main: romaji, sub: nameEn } : { main: romaji };
  return nameEn ? { main: nameEn } : undefined;
}
