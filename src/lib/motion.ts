/**
 * 動きの長さと曲線（2026-10-11 に本人と決めた）。どの動きもこの4つの長さのどれかにし、曲線は EASE_OUT にそろえる。
 * 例外は置かない。前は部品ごとにその場で 200ms・400ms・500ms と書いていて、ばらばらになっていた。
 * CSS 側は globals.css の @theme に同じ値があり（duration-react などで使う）、test/design-rules.test.ts が両方の一致を見る
 *
 * - react: 指を乗せた・押したときの反応
 * - move: 出る・消える・動く（帯・板・動画・棚・スワイプ・ハート）
 * - slow: 曲に合わせて色が変わる（キャラの色・影絵・背景の色）と、ロゴの光。1.2秒（600ms ではロゴの光が速すぎた）
 * - drift: 止まらずに漂い続ける（背景のにじみ）。行って戻る動きなので、これだけ曲線は ease-in-out
 */
export const MOTION = { react: 150, move: 300, slow: 1200, drift: 40000 } as const;

/** 速く動き出して、ゆっくり止まる曲線の制御点。globals.css の --ease-out と同じ値 */
const BEZIER = { x1: 0.23, y1: 1, x2: 0.32, y2: 1 };
export const EASE_OUT = `cubic-bezier(${BEZIER.x1}, ${BEZIER.y1}, ${BEZIER.x2}, ${BEZIER.y2})`;
/** easeOut で、曲線の x から t を求める二分法の回数 */
const BISECT_STEPS = 20;

/** 同じ速さのまま動く。流れる曲名（marquee.tsx）だけが使う。長さは時間でなく、曲名を読める速さから決める */
export const LINEAR = 'linear';

/** 動きを減らす設定の人には、位置の移動を見せない */
export function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * EASE_OUT と同じ曲線を、JavaScript で描く動き（棚の矢印と、ページの縦の送り）に使う形にしたもの。
 * 0〜1 の時間の割合から、0〜1 の進み具合を返す（3次ベジェの x から t を二分法で求めて y を返す）
 */
export function easeOut(x: number): number {
  const { x1, y1, x2, y2 } = BEZIER;
  // 3次ベジェの式（係数の 3 と次数の 3 は式そのもの）
  const at = (t: number, a: number, b: number) =>
    // eslint-disable-next-line @typescript-eslint/no-magic-numbers
    3 * a * t * (1 - t) ** 2 + 3 * b * t ** 2 * (1 - t) + t ** 3;
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < BISECT_STEPS; i++) {
    const mid = (lo + hi) / 2;
    if (at(mid, x1, x2) < x) lo = mid;
    else hi = mid;
  }
  return at((lo + hi) / 2, y1, y2);
}

let glideFrame = 0;
let stopGlide = () => {};

/**
 * ページを縦に top までなめらかに送る。ブラウザの smooth は、Chromium は距離に関わらず約 0.5 秒で、
 * Firefox は長い距離だと 0.3 秒ほど止まってから一気に飛んだ。ブラウザによらず同じ動きにするため自前で描く。
 * 時間はほかの動きと同じ MOTION.move（前は距離に応じて 0.4〜0.8 秒）。途中で自分でスクロールし始めたら（ホイール・指・キー）やめる
 */
export function glideWindowTo(top: number) {
  stopGlide();
  const from = window.scrollY;
  const distance = Math.abs(top - from);
  if (prefersReducedMotion() || distance < 1) {
    window.scrollTo({ top });
    return;
  }
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
    const t = Math.min(1, (now - started) / MOTION.move);
    window.scrollTo({ top: from + (top - from) * easeOut(t), behavior: 'instant' });
    if (t < 1) glideFrame = requestAnimationFrame(step);
    else stop();
  };
  glideFrame = requestAnimationFrame(step);
}
