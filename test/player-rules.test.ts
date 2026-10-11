import { describe, expect, it } from 'vitest';
import type { QueueItem } from '@/lib/catalog';
import {
  afterEnded,
  type BeforeRadio,
  radioExit,
  settledContext,
  skipsAutoNiconico,
} from '@/components/player/player-rules';

const song = (songId: number, producerId = 45, service: QueueItem['service'] = 'youtube') =>
  ({ songId, producerId, service }) as QueueItem;

const before = (over: Partial<BeforeRadio> = {}): BeforeRadio => ({
  queue: [song(1), song(2), song(3)],
  index: 1,
  context: 'list',
  listSource: null,
  more: null,
  ...over,
});

describe('settledContext', () => {
  it('移る途中（pending）は list として残す', () => {
    expect(settledContext('pending')).toBe('list');
    expect(settledContext('favorites')).toBe('favorites');
    expect(settledContext('radio')).toBe('radio');
  });
});

describe('radioExit', () => {
  it('流している曲が無ければトップへ', () => {
    expect(radioExit(undefined, before())).toEqual({ kind: 'empty', href: '/' });
  });

  it('始めた曲のままなら元の並びに戻し、ボカロPの画面へ', () => {
    const exit = radioExit(song(2), before());
    expect(exit).toMatchObject({ kind: 'restore', context: 'list', href: '/producers/45' });
  });

  it('お気に入りから始めたなら、お気に入りの曲の画面へ戻す', () => {
    const exit = radioExit(song(2), before({ context: 'favorites' }));
    expect(exit).toMatchObject({ kind: 'restore', context: 'favorites', href: '/favorites/songs' });
  });

  it('一覧から始めたなら、その一覧の再生用の画面へ戻す', () => {
    const exit = radioExit(song(2), before({ listSource: 'years/2010' }));
    expect(exit).toMatchObject({ kind: 'restore', href: '/years/2010/play' });
  });

  it('移る途中（pending）から始めていたら、list として戻す', () => {
    expect(radioExit(song(2), before({ context: 'pending' }))).toMatchObject({ context: 'list' });
  });

  it('ラジオで次へ進んでいたら、元の並びに戻さず、いまの曲のボカロPの並びへ', () => {
    const now = song(99, 7);
    expect(radioExit(now, before({ listSource: 'years/2010' }))).toEqual({
      kind: 'producer',
      item: now,
      href: '/producers/7',
    });
  });

  it('戻す並びが無ければ、いまの曲のボカロPの並びへ', () => {
    expect(radioExit(song(2, 8), null)).toMatchObject({ kind: 'producer', href: '/producers/8' });
  });
});

describe('skipsAutoNiconico', () => {
  const nico = song(1, 45, 'niconico');
  const base = { auto: true, blocked: true, skipped: 0, length: 3 };

  it('自動で進んだ先のニコニコの曲は、止められたあとなら飛ばす', () => {
    expect(skipsAutoNiconico(nico, base)).toBe(true);
  });

  it('自分で押した曲は飛ばさない', () => {
    expect(skipsAutoNiconico(nico, { ...base, auto: false })).toBe(false);
  });

  it('まだ止められていなければ飛ばさない', () => {
    expect(skipsAutoNiconico(nico, { ...base, blocked: false })).toBe(false);
  });

  it('YouTube の曲は飛ばさない', () => {
    expect(skipsAutoNiconico(song(1), base)).toBe(false);
  });

  it('続けて飛ばした数が並びの数に届いたら、一周したので止まる', () => {
    expect(skipsAutoNiconico(nico, { ...base, skipped: 3 })).toBe(false);
  });
});

describe('afterEnded', () => {
  it('スリープタイマーが「この曲が終わったら」なら止める', () => {
    expect(afterEnded({ kind: 'end' }, 'one')).toBe('stop');
  });

  it('1曲ループなら頭から', () => {
    expect(afterEnded(null, 'one')).toBe('repeat');
    expect(afterEnded({ kind: 'at', at: 1, from: 0 }, 'one')).toBe('repeat');
  });

  it('それ以外は次の曲へ', () => {
    expect(afterEnded(null, 'all')).toBe('next');
    expect(afterEnded(null, undefined)).toBe('next');
  });
});
