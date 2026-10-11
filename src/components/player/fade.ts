import type { Engine } from './engine';

/** 曲を替えるときに、いまの音を絞りきるまでの長さ（ミリ秒）と、その刻み */
export const FADE_OUT_MS = 150;
export const FADE_STEPS = 10;
/** 音量を 0 にしてから止めるまで待つ長さ（ミリ秒）。埋め込みの中で 0 が効くまでにばらつきがあり、一刻み（15ms）では
 * 元の音量の1割が残ったまま止まることがあった */
export const SETTLE_MS = 60;
/** 絞りきって消音・一時停止してから、次の動画を頼むまで待つ長さ（ミリ秒）。止まりきる前に替えると、プツッと鳴った */
export const PAUSE_WAIT_MS = 100;

/**
 * 絞る途中の音量。終わりほど細かく下げる（2乗）。一定の割合で下げると、最後の一刻みが元の音量の1割残り、
 * そこで止めるとプツッと鳴った（2026-10-11 に録って確かめた）。2乗なら最後の一刻みは 1%
 */
export const faded = (volume: number, step: number) =>
  Math.round(volume * (1 - step / FADE_STEPS) ** 2);

/**
 * 音量を絞りきってから done を呼ぶ（曲の切り替えと一時停止）。終わりほど細かく下げ（faded）、0 にしてから SETTLE_MS 待つ。
 * 刻みごとの時計は timer に渡す（途中でやめるときに止めるため）。keep が false になったら絞るのをやめて stop を呼ぶ
 */
export function fadeOut(
  engine: Engine,
  volume: number,
  {
    timer,
    done,
    keep = () => true,
    stop = () => {},
  }: {
    timer: (t: ReturnType<typeof setTimeout>) => void;
    done: () => void;
    keep?: () => boolean;
    stop?: () => void;
  },
) {
  let step = 0;
  const tick = () => {
    if (!keep()) {
      stop();
      return;
    }
    if (step === FADE_STEPS) {
      done();
      return;
    }
    step += 1;
    engine.setVolume(faded(volume, step));
    timer(setTimeout(tick, step === FADE_STEPS ? SETTLE_MS : FADE_OUT_MS / FADE_STEPS));
  };
  tick();
}
