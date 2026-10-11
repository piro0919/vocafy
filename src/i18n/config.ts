/**
 * 画面の言語。日本語はいままでの住所のまま（`/producers/45`）、英語は頭に `/en` を付ける（`/en/producers/45`）。
 * ページは `app/[lang]` の下にあり、日本語の住所は next.config.ts の rewrites が中で `/ja/...` につなぐ。
 * 曲名・ボカロP名・歌声の名前は、どちらの言語でも日本語のまま出す（2026-10-12 に本人と決めた）
 */
export const LANGS = ['ja', 'en'] as const;
export type Lang = (typeof LANGS)[number];

export const DEFAULT_LANG: Lang = 'ja';

export const isLang = (value: string): value is Lang =>
  (LANGS as readonly string[]).includes(value);

/** 頭に言語の付かない住所（`/producers/45`）を、その言語の住所にする。外のサイトの住所と `#` はそのまま */
export function localize(path: string, lang: Lang): string {
  if (lang === DEFAULT_LANG || !path.startsWith('/') || path.startsWith('//')) return path;
  return path === '/' ? `/${lang}` : `/${lang}${path}`;
}

/**
 * 住所の頭の言語を外す。`/en/producers/45` も、サーバーが中で描く `/ja/producers/45` も `/producers/45` になる。
 * 画面の判定（いまどの画面か）は、どの言語でも同じ住所で比べる
 */
export function stripLang(pathname: string): string {
  const match = /^\/(ja|en)(?=\/|$)/.exec(pathname);
  if (!match) return pathname;
  return pathname.slice(match[0].length) || '/';
}

/** 住所の頭の言語。付いていなければ日本語 */
export function langOfPath(pathname: string): Lang {
  return pathname === '/en' || pathname.startsWith('/en/') ? 'en' : DEFAULT_LANG;
}
