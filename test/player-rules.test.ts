import { describe, expect, it } from 'vitest';
import type { QueueItem } from '@/lib/catalog';
import {
  afterEnded,
  type BeforeRadio,
  LOOSE,
  ownerHref,
  owns,
  PENDING,
  radioExit,
  settledOwner,
  skipsAutoNiconico,
} from '@/components/player/player-rules';
import type { Owner, QueueOwner } from '@/components/player/player-types';

const song = (songId: number, producerId = 45, service: QueueItem['service'] = 'youtube') =>
  ({ songId, producerId, service }) as QueueItem;

const before = (over: Partial<BeforeRadio> = {}): BeforeRadio => ({
  queue: [song(1), song(2), song(3)],
  index: 1,
  owner: { kind: 'producer', producerId: 45 },
  ...over,
});

const PRODUCER_45: QueueOwner = { kind: 'producer', producerId: 45 };
const YEAR_2010: QueueOwner = { kind: 'list', source: 'years/2010' };
const RADIO_1: QueueOwner = { kind: 'radio', home: '/radio/1' };
const FAVORITES: QueueOwner = { kind: 'favorites' };

describe('owns', () => {
  it('流していなければ、どの画面も持ち主ではない', () => {
    expect(owns({ kind: 'producer', producerId: 45 }, PRODUCER_45, null)).toBe(false);
  });

  it('ボカロPの並びは、そのボカロPの画面だけが持つ', () => {
    const owner: Owner = { kind: 'producer', producerId: 45 };
    expect(owns(owner, PRODUCER_45, song(1))).toBe(true);
    expect(owns(owner, { kind: 'producer', producerId: 7 }, song(1))).toBe(false);
  });

  it('ボカロPの並びの中の合作の曲（曲のボカロPが別の人）でも、並びの持ち主の画面のまま', () => {
    expect(owns({ kind: 'producer', producerId: 45 }, PRODUCER_45, song(1, 7))).toBe(true);
  });

  it('ボカロPの画面へ移る途中は、流している曲のボカロPの画面を持ち主とみる', () => {
    expect(owns(PENDING, PRODUCER_45, song(1, 45))).toBe(true);
    expect(owns(PENDING, PRODUCER_45, song(1, 7))).toBe(false);
  });

  it('持ち主の画面が無い並び（歌声の画面の代表曲）は、流している曲のボカロPの画面でも持たない', () => {
    expect(owns(LOOSE, PRODUCER_45, song(1, 45))).toBe(false);
  });

  it('一覧の並びは、同じ一覧の再生用の画面だけが持つ', () => {
    expect(owns({ kind: 'list', source: 'years/2010' }, YEAR_2010, song(1))).toBe(true);
    expect(owns({ kind: 'list', source: 'years/2011' }, YEAR_2010, song(1))).toBe(false);
    expect(owns({ kind: 'list', source: 'years/2010' }, PRODUCER_45, song(1))).toBe(false);
  });

  it('ラジオは、そのラジオの画面だけが持つ', () => {
    expect(owns({ kind: 'radio', home: '/radio/1' }, RADIO_1, song(1))).toBe(true);
    expect(owns({ kind: 'radio', home: '/radio/2' }, RADIO_1, song(1))).toBe(false);
  });

  it('お気に入りの並びは、お気に入りの曲の画面が持つ', () => {
    expect(owns({ kind: 'favorites' }, FAVORITES, song(1))).toBe(true);
    expect(owns({ kind: 'favorites' }, PRODUCER_45, song(1))).toBe(false);
  });

  it('持ち主になった画面は、自分を持ち主とみる（takeOver のあと）', () => {
    for (const page of [PRODUCER_45, YEAR_2010, RADIO_1, FAVORITES]) {
      expect(owns(page, page, song(1))).toBe(true);
    }
  });
});

describe('ownerHref', () => {
  it('持ち主の画面の住所', () => {
    expect(ownerHref({ kind: 'producer', producerId: 7 }, song(1))).toBe('/producers/7');
    expect(ownerHref({ kind: 'favorites' }, song(1))).toBe('/favorites/songs');
    expect(ownerHref({ kind: 'list', source: 'years/2010' }, song(1))).toBe('/years/2010/play');
    expect(ownerHref({ kind: 'radio', home: '/radio/9' }, song(1))).toBe('/radio/9');
  });

  it('移る途中と、持ち主の画面が無い並びは、流している曲のボカロPの画面', () => {
    expect(ownerHref(PENDING, song(1, 8))).toBe('/producers/8');
    expect(ownerHref(LOOSE, song(1, 8))).toBe('/producers/8');
  });
});

describe('settledOwner', () => {
  it('移る途中は、流している曲のボカロPの並びとして残す', () => {
    expect(settledOwner(PENDING, song(1, 8))).toEqual({ kind: 'producer', producerId: 8 });
    expect(settledOwner(LOOSE, song(1, 8))).toBe(LOOSE);
  });
});

describe('radioExit', () => {
  it('流している曲が無ければトップへ', () => {
    expect(radioExit(undefined, before())).toEqual({ kind: 'empty', href: '/' });
  });

  it('始めた曲のままなら元の並びに戻し、その持ち主の画面へ', () => {
    expect(radioExit(song(2), before())).toMatchObject({
      kind: 'restore',
      owner: { kind: 'producer', producerId: 45 },
      href: '/producers/45',
    });
  });

  it('お気に入りから始めたなら、お気に入りの曲の画面へ戻す', () => {
    const exit = radioExit(song(2), before({ owner: { kind: 'favorites' } }));
    expect(exit).toMatchObject({ kind: 'restore', href: '/favorites/songs' });
  });

  it('一覧から始めたなら、その一覧の再生用の画面へ戻す', () => {
    const exit = radioExit(song(2), before({ owner: { kind: 'list', source: 'years/2010' } }));
    expect(exit).toMatchObject({ kind: 'restore', href: '/years/2010/play' });
  });

  it('移る途中から始めていたら、いまの曲のボカロPの並びとして戻す', () => {
    expect(radioExit(song(2, 8), before({ owner: PENDING }))).toMatchObject({
      owner: { kind: 'producer', producerId: 8 },
    });
  });

  it('ラジオで次へ進んでいたら、元の並びに戻さず、いまの曲のボカロPの並びへ', () => {
    const now = song(99, 7);
    expect(radioExit(now, before({ owner: { kind: 'list', source: 'years/2010' } }))).toEqual({
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
