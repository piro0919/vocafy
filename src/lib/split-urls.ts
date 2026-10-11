/** 説明文の中の URL。括弧（半角・全角）と「」で終わりとみなす（説明欄では「（https://…）」のように書かれることが多い） */
const URL_SOURCE = String.raw`https?:\/\/[^\s<>「」（）()]+`;

/**
 * ニコニコが説明文の中でリンクにする番号の書き方と、その行き先。
 * 2026-10-11 に、99本の視聴ページの説明文でニコニコが付けたリンクを数えて確かめたものだけを置く。
 * co（コミュニティ）はリンクにされていなかった
 */
const NICONICO_LINKS: { source: string; href: (id: string) => string }[] = [
  { source: String.raw`(?:sm|nm)\d+`, href: (id) => `https://www.nicovideo.jp/watch/${id}` },
  { source: String.raw`mylist\/\d+`, href: (id) => `https://www.nicovideo.jp/${id}` },
  { source: String.raw`user\/\d+`, href: (id) => `https://www.nicovideo.jp/${id}` },
  { source: String.raw`nc\d+`, href: (id) => `https://commons.nicovideo.jp/works/${id}` },
  { source: String.raw`ar\d+`, href: (id) => `https://ch.nicovideo.jp/article/${id}` },
];

/** 番号の前後に英数字が続くとき（sm123mp3 など）はリンクにしない。ニコニコと同じ */
const NICONICO_SOURCE = String.raw`(?<![A-Za-z0-9/])(?:${NICONICO_LINKS.map((l) => `(${l.source})`).join('|')})(?![A-Za-z0-9])`;

const URL_RE = new RegExp(`(${URL_SOURCE})`, 'g');
const WITH_NICONICO_RE = new RegExp(`(${URL_SOURCE})|${NICONICO_SOURCE}`, 'g');

/**
 * 説明文を、地の文とリンクに分ける。並びは元の文の順で、リンクの部分は href を持つ。
 * niconico のときは、ニコニコがリンクにする番号の書き方（sm123・mylist/123 など）もリンクにする
 */
export function splitUrls(text: string, niconico = false): { text: string; href?: string }[] {
  const parts: { text: string; href?: string }[] = [];
  let last = 0;
  for (const m of text.matchAll(niconico ? WITH_NICONICO_RE : URL_RE)) {
    if (m.index > last) parts.push({ text: text.slice(last, m.index) });
    const [whole, url, ...ids] = m;
    const at = ids.findIndex((id) => id !== undefined);
    parts.push({ text: whole, href: url ?? NICONICO_LINKS[at].href(whole) });
    last = m.index + whole.length;
  }
  if (last < text.length) parts.push({ text: text.slice(last) });
  return parts;
}
