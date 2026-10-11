import type { Lang } from './config';

/** 文字列か、数などを受けて文字列を返す関数 */
type Entry = string | ((...args: never[]) => string);

/** 文言の組。値は文字列（または文字列を返す関数）として扱い、英語も日本語と同じ鍵と形をそろえる */
type Widen<T> = { [K in keyof T]: T[K] extends string ? string : T[K] };

/**
 * 画面の文言を、使う部品の中に日本語と英語で並べて書く。英語に鍵が欠けていると型で落ちる。
 * 部品の中では `TEXT[lang]` で引く（ブラウザの部品は useLang()、サーバーの部品はページの params の lang）
 */
export function defineText<T extends Record<string, Entry>>(text: {
  ja: T;
  en: Widen<NoInfer<T>>;
}): Record<Lang, Widen<T>> {
  return text as Record<Lang, Widen<T>>;
}
