import type { PlaybackTime } from './player-types';

/** 拾った時刻から、今の時刻を補う。再生中だけ進め、曲の長さを越えない。時刻は 0.5 秒おきにしか拾えないので、間は表示側で補う */
export function now(time: PlaybackTime, playing: boolean, at = performance.now()): number {
  const elapsed = playing ? (at - time.at) / 1000 : 0;
  return Math.min(time.current + elapsed, time.duration || Infinity);
}

/** 秒を「分:秒」にする（3:07）。負の値と端数は切る */
export function clock(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
