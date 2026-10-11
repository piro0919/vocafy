import { describe, expect, it } from 'vitest';
import type { QueueItem } from '@/lib/catalog';
import {
  appendItems,
  EMPTY_CURSOR,
  firstMore,
  followingPage,
  freshItems,
  isNearEnd,
  moveTo,
  radioSeeds,
  restart,
  stepFrom,
  upcomingOf,
  withOrder,
} from '@/components/player/queue-state';

const song = (songId: number) => ({ songId }) as QueueItem;
const songs = (...ids: number[]) => ids.map(song);
const ids = (items: QueueItem[]) => items.map((s) => s.songId);
const sorted = (xs: number[]) => xs.toSorted((a, b) => a - b);

describe('restart', () => {
  it('ランダムでなければ並びどおりに流し、いまの曲の位置を指す', () => {
    const c = restart(songs(1, 2, 3, 4), 2, false);
    expect(c.order).toEqual([0, 1, 2, 3]);
    expect(c.position).toBe(2);
  });

  it('ランダムなら、いまの曲を先頭にして残りを混ぜる', () => {
    const c = restart(songs(1, 2, 3, 4, 5), 3, true);
    expect(c.order[0]).toBe(3);
    expect(sorted(c.order)).toEqual([0, 1, 2, 3, 4]);
    expect(c.position).toBe(0);
  });
});

describe('moveTo', () => {
  it('同じ並びの中で移るだけなら、流す順を作り直さない', () => {
    const queue = songs(1, 2, 3, 4);
    const c = withOrder(queue, 0, [0, 3, 1, 2]);
    const moved = moveTo(c, queue, 1, true);
    expect(moved.order).toEqual([0, 3, 1, 2]);
    expect(moved.position).toBe(2);
  });

  it('中身が同じでも別の配列なら、新しい並びとして流す順を作り直す', () => {
    const c = withOrder(songs(1, 2, 3), 0, [0, 2, 1]);
    const moved = moveTo(c, songs(1, 2, 3), 1, false);
    expect(moved.order).toEqual([0, 1, 2]);
    expect(moved.position).toBe(1);
  });
});

describe('appendItems', () => {
  it('いまの曲と流してきた順を変えずに、足した曲を流す順の後ろに付ける', () => {
    const c = withOrder(songs(1, 2, 3), 1, [2, 0, 1]);
    const next = appendItems(c, songs(4, 5), false);
    expect(ids(next.queue)).toEqual([1, 2, 3, 4, 5]);
    expect(next.order).toEqual([2, 0, 1, 3, 4]);
    expect(next.index).toBe(1);
    expect(next.position).toBe(c.position);
  });

  it('ランダムなら、足した曲どうしを混ぜて後ろに付ける', () => {
    const c = restart(songs(1, 2), 0, false);
    const next = appendItems(c, songs(3, 4, 5, 6), true);
    expect(next.order.slice(0, 2)).toEqual([0, 1]);
    expect(sorted(next.order.slice(2))).toEqual([2, 3, 4, 5]);
  });
});

describe('freshItems', () => {
  it('もう並びにある曲は外す', () => {
    expect(ids(freshItems(songs(1, 2, 3), songs(3, 4, 1, 5)))).toEqual([4, 5]);
  });
});

describe('isNearEnd', () => {
  it('残り1曲になったら近いとみる', () => {
    const order = [0, 1, 2, 3, 4];
    expect(isNearEnd(2, order)).toBe(false);
    expect(isNearEnd(3, order)).toBe(true);
    expect(isNearEnd(4, order)).toBe(true);
  });
});

describe('一覧の続きのページ', () => {
  it('押したページの次から、最後のページのあとは1ページ目に戻り、押したページの手前で終わる', () => {
    const pages: number[] = [];
    let m = firstMore({ source: 'years/2010', start: 3, last: 4 });
    while (m) {
      pages.push(m.next);
      m = followingPage(m);
    }
    expect(pages).toEqual([4, 1, 2]);
  });

  it('1ページしかなければ続きは無い', () => {
    expect(firstMore({ source: 'years/2010', start: 1, last: 1 })).toBeNull();
  });
});

describe('stepFrom', () => {
  const plain = { hasMore: false, shuffle: false };

  it('並びが空なら進まない', () => {
    expect(stepFrom(EMPTY_CURSOR, 1, plain)).toEqual({ kind: 'stay' });
  });

  it('流す順の先頭から前へは戻らない', () => {
    expect(stepFrom(restart(songs(1, 2), 0, false), -1, plain)).toEqual({ kind: 'stay' });
  });

  it('流す順で次の曲へ進む', () => {
    const c = withOrder(songs(1, 2, 3), 2, [2, 0, 1]);
    expect(stepFrom(c, 1, plain)).toEqual({ kind: 'play', order: [2, 0, 1], index: 0 });
  });

  it('最後の曲の次は先頭に戻る', () => {
    const c = restart(songs(1, 2, 3), 2, false);
    expect(stepFrom(c, 1, plain)).toEqual({ kind: 'play', order: [0, 1, 2], index: 0 });
  });

  it('一覧の続きがあれば、最後の曲の次は先頭に戻らず続きを待つ', () => {
    const c = restart(songs(1, 2, 3), 2, false);
    expect(stepFrom(c, 1, { hasMore: true, shuffle: false })).toEqual({ kind: 'more' });
  });

  it('ランダムなら、ひと回りしたところで混ぜ直す', () => {
    const c = restart(songs(1, 2, 3, 4), 0, false);
    const last = withOrder(c.queue, 3, c.order);
    const step = stepFrom(last, 1, { hasMore: false, shuffle: true }, () => 0.5);
    expect(step.kind).toBe('play');
    if (step.kind !== 'play') return;
    expect(step.index).toBe(2);
    expect(step.order[0]).toBe(2);
    expect(sorted(step.order)).toEqual([0, 1, 2, 3]);
  });
});

describe('upcomingOf', () => {
  const c = withOrder(songs(10, 11, 12, 13, 14), 2, [0, 1, 2, 3, 4]);

  it('いまの曲の次から並べ、ループなら先頭に戻って続ける', () => {
    expect(upcomingOf(c, true, 10).map((u) => u.index)).toEqual([3, 4, 0, 1]);
  });

  it('ループでなければ（ラジオなど）最後で終わる', () => {
    expect(upcomingOf(c, false, 10).map((u) => u.index)).toEqual([3, 4]);
  });

  it('limit 曲までにする', () => {
    expect(upcomingOf(c, true, 3).map((u) => u.item.songId)).toEqual([13, 14, 10]);
  });
});

describe('radioSeeds', () => {
  it('いまの曲から始め、残りは並びの後ろからさかのぼる', () => {
    expect(ids(radioSeeds(songs(1, 2, 3, 4, 5), 1, 4))).toEqual([2, 5, 4, 3]);
  });
});
