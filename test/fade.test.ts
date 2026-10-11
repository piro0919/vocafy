import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Engine } from '@/components/player/engine';
import { FADE_OUT_MS, FADE_STEPS, faded, fadeOut, SETTLE_MS } from '@/components/player/fade';

const engine = () =>
  ({ setVolume: vi.fn() }) as unknown as Engine & { setVolume: ReturnType<typeof vi.fn> };

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('faded', () => {
  it('終わりほど細かく下げ、最後の一刻みは元の音量の1%', () => {
    expect(faded(100, 0)).toBe(100);
    expect(faded(100, FADE_STEPS - 1)).toBe(1);
    expect(faded(100, FADE_STEPS)).toBe(0);
  });
});

describe('fadeOut', () => {
  it('刻みごとに絞り、0 にしてから SETTLE_MS 待って done を呼ぶ', () => {
    const e = engine();
    const done = vi.fn();
    fadeOut(e, 100, { timer: () => {}, done });
    // 最初の一刻みはすぐ
    expect(e.setVolume).toHaveBeenLastCalledWith(faded(100, 1));
    vi.advanceTimersByTime((FADE_OUT_MS / FADE_STEPS) * (FADE_STEPS - 1));
    expect(e.setVolume).toHaveBeenLastCalledWith(0);
    expect(e.setVolume).toHaveBeenCalledTimes(FADE_STEPS);
    expect(done).not.toHaveBeenCalled();
    vi.advanceTimersByTime(SETTLE_MS - 1);
    expect(done).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(done).toHaveBeenCalledTimes(1);
  });

  it('keep が false になったら、絞るのをやめて stop を呼ぶ', () => {
    const e = engine();
    let alive = true;
    const done = vi.fn();
    const stop = vi.fn();
    fadeOut(e, 100, { timer: () => {}, done, keep: () => alive, stop });
    alive = false;
    vi.advanceTimersByTime(FADE_OUT_MS + SETTLE_MS);
    expect(e.setVolume).toHaveBeenCalledTimes(1);
    expect(stop).toHaveBeenCalledTimes(1);
    expect(done).not.toHaveBeenCalled();
  });

  it('刻みの時計を渡すので、途中で止められる', () => {
    const e = engine();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const done = vi.fn();
    fadeOut(e, 100, { timer: (t) => (timer = t), done });
    clearTimeout(timer);
    vi.advanceTimersByTime(FADE_OUT_MS + SETTLE_MS);
    expect(e.setVolume).toHaveBeenCalledTimes(1);
    expect(done).not.toHaveBeenCalled();
  });
});
