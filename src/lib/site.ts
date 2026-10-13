import type { Metadata } from 'next';
import { type Lang, localize } from '@/i18n/config';

/** 問い合わせの窓口。Google フォーム（piro.haniwa@gmail.com の持ち物）で、回答はメールで届く */
export const CONTACT_FORM_URL =
  'https://docs.google.com/forms/d/e/1FAIpQLSezZun3wZSCFhGpV-m1uXb7VaB9H4twS7OjAZMfE0UfWEIWkw/viewform';

export const OPERATOR = 'kk-web';

export const SITE_URL = 'https://vocafy.kkweb.io';

/**
 * ページの正規の住所（canonical）。検索に載せるページが自分の住所を名乗り、?song= 付きや前の住所を同じページとしてまとめさせる。
 * レイアウトには書かない（書くと、書いていないページまで全部が同じ住所を名乗る）。言語の対応（hreflang）はサイトマップにまとめる
 */
export function canonical(path: string, lang: Lang): NonNullable<Metadata['alternates']> {
  return { canonical: `${SITE_URL}${localize(path, lang)}` };
}

/** 支援の窓口（Buy Me a Coffee）。設定の画面の一番下にだけ置く（support-link.tsx） */
export const SUPPORT_URL = 'https://buymeacoffee.com/piro0919';
