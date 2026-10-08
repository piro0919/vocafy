/**
 * 動きの共通設定。出てくる・移るものは、速く動き出してゆっくり止まる曲線にそろえる。
 * CSS 側は globals.css の --ease-out（同じ値）を使う
 */
export const EASE_OUT = 'cubic-bezier(0.23, 1, 0.32, 1)';

/** 動きを減らす設定の人には、位置の移動を見せない */
export function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
