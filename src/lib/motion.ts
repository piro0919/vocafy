/**
 * 動きの共通設定。出てくる・移るものは、速く動き出してゆっくり止まる曲線にそろえる。
 * CSS 側は globals.css の --ease-out（同じ値）を使う
 */
export const EASE_OUT = 'cubic-bezier(0.23, 1, 0.32, 1)';

/** 動きを減らす設定の人には、位置の移動を見せない */
export function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** ゆっくり動き出して、ゆっくり止まる（棚の矢印と、ページの縦の送り） */
export const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

let glideFrame = 0;
let stopGlide = () => {};

/**
 * ページを縦に top までなめらかに送る。ブラウザの smooth は、Chromium は距離に関わらず約 0.5 秒で、
 * Firefox は長い距離だと 0.3 秒ほど止まってから一気に飛んだ。ブラウザによらず同じ動きにするため自前で描く。
 * 時間は距離に応じて 0.4〜0.8 秒。途中で自分でスクロールし始めたら（ホイール・指・キー）やめる
 */
export function glideWindowTo(top: number) {
  stopGlide();
  const from = window.scrollY;
  const distance = Math.abs(top - from);
  if (prefersReducedMotion() || distance < 1) {
    window.scrollTo({ top });
    return;
  }
  const duration = 400 + (Math.min(distance, 4000) / 4000) * 400;
  const started = performance.now();
  const stop = () => {
    cancelAnimationFrame(glideFrame);
    window.removeEventListener('wheel', stop);
    window.removeEventListener('touchstart', stop);
    window.removeEventListener('keydown', stop);
    stopGlide = () => {};
  };
  stopGlide = stop;
  window.addEventListener('wheel', stop, { passive: true });
  window.addEventListener('touchstart', stop, { passive: true });
  window.addEventListener('keydown', stop);
  const step = (now: number) => {
    const t = Math.min(1, (now - started) / duration);
    window.scrollTo({ top: from + (top - from) * easeInOut(t), behavior: 'instant' });
    if (t < 1) glideFrame = requestAnimationFrame(step);
    else stop();
  };
  glideFrame = requestAnimationFrame(step);
}
