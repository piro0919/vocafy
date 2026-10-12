// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from 'vitest';
import type { QueueItem } from '../src/lib/catalog';
import { savePvChoice, withPv } from '../src/components/player/pv-choice';

const item = (songId: number, over: Partial<QueueItem> = {}): QueueItem => ({
  songId,
  title: `曲${songId}`,
  service: 'youtube',
  videoId: `yt${songId}`,
  thumb: `https://i.ytimg.com/vi/yt${songId}/default.jpg`,
  producerId: 1,
  producerName: 'P',
  vocalists: '初音ミク',
  ...over,
});

const topic = item(1, { pv: { videoId: 'sm1', thumb: 'https://nico/1.M' } });
const mv = item(2);

afterEach(() => localStorage.clear());

describe('withPv（Topic の曲をニコニコの PV に差し替える）', () => {
  it('はじめは YouTube のまま、同じ配列を返す', () => {
    const items = [topic, mv];
    expect(withPv(items)).toBe(items);
  });

  it('ニコニコを選んだら、PV のある曲だけニコニコに替える', () => {
    savePvChoice(true);
    const [swapped, kept] = withPv([topic, mv]);
    expect(swapped).toMatchObject({
      songId: 1,
      service: 'niconico',
      videoId: 'sm1',
      thumb: 'https://nico/1.M',
    });
    expect(swapped).not.toHaveProperty('pv');
    expect(kept).toBe(mv);
  });

  it('同じ並びを渡されたら同じ配列を返す（流す順を作り直させない）', () => {
    savePvChoice(true);
    const items = [topic, mv];
    const once = withPv(items);
    expect(withPv(items)).toBe(once);
    expect(withPv(once)).toBe(once);
  });
});
