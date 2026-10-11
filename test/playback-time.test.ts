import { describe, expect, it } from 'vitest';
import { clock, now } from '@/components/player/playback-time';

describe('clock', () => {
  it('分:秒にし、秒は2桁にそろえる', () => {
    expect(clock(0)).toBe('0:00');
    expect(clock(7.9)).toBe('0:07');
    expect(clock(187)).toBe('3:07');
    expect(clock(3600)).toBe('60:00');
  });

  it('負の値は 0 にする', () => {
    expect(clock(-5)).toBe('0:00');
  });
});

describe('now', () => {
  const time = { current: 10, duration: 200, at: 1000 };

  it('再生中は、拾ってからの時間を足す', () => {
    expect(now(time, true, 3500)).toBe(12.5);
  });

  it('止まっているあいだは進めない', () => {
    expect(now(time, false, 3500)).toBe(10);
  });

  it('曲の長さを越えない。長さが分からないあいだ（0）は越えても止めない', () => {
    expect(now(time, true, 1_000_000)).toBe(200);
    expect(now({ ...time, duration: 0 }, true, 6000)).toBe(15);
  });
});
