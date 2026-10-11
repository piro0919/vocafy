/** Unicode の最大の符号位置。これを超える文字参照は戻さない（String.fromCodePoint が投げる） */
const MAX_CODE_POINT = 0x10ffff;
const HEX = 16;

/** 文字参照を1つ戻す。範囲外の番号はそのまま残す */
function codePoint(text: string, n: number) {
  return Number.isInteger(n) && n >= 0 && n <= MAX_CODE_POINT ? String.fromCodePoint(n) : text;
}

/** HTML の文字参照を戻す（名前付きのよく使うものと、10進・16進の番号）。&amp; は最後に戻す（二重に包まれた参照を戻しすぎない） */
export function decodeEntities(s: string) {
  return s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (text, n: string) => codePoint(text, Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (text, n: string) => codePoint(text, parseInt(n, HEX)))
    .replace(/&amp;/g, '&');
}

/** 説明文の HTML を文にする。改行（<br>）だけ残してタグを外し、文字参照を戻す */
export function htmlToText(html: string) {
  return decodeEntities(html.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '')).trim();
}
