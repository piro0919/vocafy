/**
 * 検索の文字の正規化。全角と半角、大文字と小文字、カタカナとひらがなを区別しない。
 * 空白と、区切りに使われがちな記号（・、。など）は無視する。長音（ー）は区別に使うので残す。
 * DB にも VocaDB にも触らないので、テストから確かめられる
 */
export function normalize(text: string): string {
  return text
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60))
    .replace(/[\s・、。,.!?！？'"「」『』()（）［］[\]~〜♪☆★*＊/／-]/g, '');
}

/**
 * ローマ字の曲名を、探すための形にする。長音の記号（Yūkai の ū など）を外してから normalize にかける。
 * かなの曲名には使わない（濁点まで外れてしまうため）
 */
export function normalizeRomaji(text: string): string {
  return normalize(text.normalize('NFKD').replace(/[\u0300-\u036f]/g, ''));
}

/**
 * どれだけ当てはまるか。頭から一致するものを先、途中に含むものを後にする。当てはまらなければ 0
 */
export function score(target: string, query: string): number {
  if (!query) return 0;
  if (target.startsWith(query)) return 2;
  return target.includes(query) ? 1 : 0;
}
