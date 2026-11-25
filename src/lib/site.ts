import type { Metadata } from 'next';
import { DEFAULT_LANG, LANGS, type Lang, localize } from '@/i18n/config';

/** 問い合わせの窓口。Google フォーム（piro.haniwa@gmail.com の持ち物）で、回答はメールで届く */
export const CONTACT_FORM_URL =
  'https://docs.google.com/forms/d/e/1FAIpQLSezZun3wZSCFhGpV-m1uXb7VaB9H4twS7OjAZMfE0UfWEIWkw/viewform';

export const OPERATOR = 'kk-web';

export const SITE_URL = 'https://vocafy.kkweb.io';

/** 頭に言語の付かない住所（`/producers/45`）の、言語ごとの住所と、言語の決まらない人向けの既定（x-default。日本語） */
export function languageUrls(path: string): Record<string, string> {
  const url = (lang: Lang) => `${SITE_URL}${localize(path, lang)}`;
  return {
    ...Object.fromEntries(LANGS.map((lang) => [lang, url(lang)])),
    'x-default': url(DEFAULT_LANG),
  };
}

/**
 * ページの正規の住所（canonical）と、同じページの別の言語（hreflang）。検索に載せるページが自分の住所を名乗り、
 * ?song= 付きや前の住所を同じページとしてまとめさせる。英語のページは名前を訳しただけで並びが同じなので、
 * 重複でなく言語違いとして渡すため、ページの中にも hreflang を書く（2026-11-26。前はサイトマップにだけ書いていた）。
 * レイアウトには書かない（書くと、書いていないページまで全部が同じ住所を名乗る）
 */
export function canonical(path: string, lang: Lang): NonNullable<Metadata['alternates']> {
  return { canonical: `${SITE_URL}${localize(path, lang)}`, languages: languageUrls(path) };
}

/**
 * 検索に載せるボカロPの曲数の下限。これより少ない人の画面は noindex にし、サイトマップから外す（2026-11-26）。
 * ボカロPの画面の本文は曲名・歌声・日付の並びだけで、曲の少ない画面は中身がほとんど無い。
 * 手元の DB の 744 人では、10曲未満が 169 人（23%）。14曲のイヤイヤP の本文が約420文字
 */
export const MIN_INDEXED_SONGS = 10;

export const isIndexedProducer = (songCount: number) => songCount >= MIN_INDEXED_SONGS;

/** 支援の窓口（Buy Me a Coffee）。設定の画面の一番下にだけ置く（support-link.tsx） */
export const SUPPORT_URL = 'https://buymeacoffee.com/piro0919';
