/** カタカナとひらがなの文字の番号の差 */
const KATAKANA_TO_HIRAGANA = 0x60;
/**
 * 検索の文字の正規化。全角と半角、大文字と小文字、カタカナとひらがなを区別しない。
 * 空白と、区切りに使われがちな記号（・、。など）は無視する。長音（ー）は区別に使うので残す。
 * DB にも VocaDB にも触らないので、テストから確かめられる
 */
export function normalize(text: string): string {
  return text
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - KATAKANA_TO_HIRAGANA))
    .replace(/[\s・、。,.!?！？'"「」『』()（）［］[\]~〜♪☆★*＊/／-]/g, '');
}

/**
 * ローマ字の曲名を、探すための形にする。長音の記号（Yūkai の ū など）を外してから normalize にかける。
 * かなの曲名には使わない（濁点まで外れてしまうため）
 */
export function normalizeRomaji(text: string): string {
  return foldLong(normalize(text.normalize('NFKD').replace(/[\u0300-\u036f]/g, '')));
}

/**
 * ローマ字の伸ばす音の書き方の揺れをならす（2026-10-12）。Shoushitsu・Shoshitsu・Shōshitsu を同じにする。
 * 探す言葉にも同じことをしてから比べる（findInIndex）。英語の名前にもかけるが、両側に同じことをするので当たり方は変わらない
 */
export function foldLong(text: string): string {
  return text
    .replace(/ou|oo/g, 'o')
    .replace(/uu/g, 'u')
    .replace(/aa/g, 'a')
    .replace(/ii/g, 'i')
    .replace(/ee/g, 'e');
}

/**
 * どれだけ当てはまるか。頭から一致するものを先、途中に含むものを後にする。当てはまらなければ 0
 */
export function score(target: string, query: string): number {
  if (!query) return 0;
  if (target.startsWith(query)) return 2;
  return target.includes(query) ? 1 : 0;
}

/**
 * 探す価値のある言葉か（2026-10-12 に本人と決めた）。かな・英数字の1文字では探さない。「a」「あ」で始まる曲だけで
 * 数百〜千曲あり、上位を出すために2段目の索引を数十本読むことになるため。漢字や記号の1文字は探す
 * （「嘘」「雨」「🐈」のような1文字の曲名が約300曲ある）。normalize したあとの言葉を受け取る
 */
export function searchable(query: string): boolean {
  const chars = [...query];
  if (chars.length !== 1) return chars.length > 1;
  return !/^[\p{Script=Hiragana}\p{Script=Katakana}a-z0-9ー]$/u.test(query);
}
