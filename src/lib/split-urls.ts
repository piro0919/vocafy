/** 説明文の中の URL。括弧（半角・全角）と「」で終わりとみなす（説明欄では「（https://…）」のように書かれることが多い） */
const URL_RE = /(https?:\/\/[^\s<>「」（）()]+)/g;

/** 説明文を、地の文と URL に分ける。並びは元の文の順で、URL の部分は url を持つ */
export function splitUrls(text: string): { text: string; url?: true }[] {
  return text
    .split(URL_RE)
    .map((part, i) => (i % 2 === 1 ? { text: part, url: true as const } : { text: part }))
    .filter((part) => part.text !== '');
}
