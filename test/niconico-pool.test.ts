import type { NiconicoPoolOptions } from 'niconico-embed-player';
import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * iPad・iPhone で、見えているニコニコの曲の埋め込みを先に読み込んでおく入れ物（niconico-pool.ts）。仕組みはパッケージ
 * niconico-embed-player にあり、読み込み・数え方・受け取り・温め・捨て方のテストもパッケージの側にある。ここでは、パッケージを
 * 偽物に替えて、Vocafy から渡すもの（枠・流している曲・流し始める位置・読み上げの名前）を確かめる
 */

const pool = { want: vi.fn(), take: vi.fn(), status: vi.fn(), refresh: vi.fn(), destroy: vi.fn() };
let given: NiconicoPoolOptions[] = [];

vi.mock('niconico-embed-player', () => ({
  createNiconicoPool: (options: NiconicoPoolOptions) => {
    given.push(options);
    return pool;
  },
}));

const place = { pathname: '/' };
vi.stubGlobal('location', place);

const { createNiconicoPool, niconicoFrameTitle } =
  await import('@/components/player/niconico-pool');

beforeEach(() => {
  given = [];
  place.pathname = '/';
});

describe('createNiconicoPool', () => {
  it('枠・流している曲・流し始める位置・読み上げの名前を渡し、パッケージの入れ物をそのまま返す', () => {
    const frame = () => null;
    const playing = () => 'sm1';
    const startOf = (videoId: string) => (videoId === 'sm2' ? 61 : undefined);
    expect(createNiconicoPool(frame, playing, startOf)).toBe(pool);
    expect(given).toEqual([
      { container: frame, playing, startAt: startOf, title: 'ニコニコ動画のプレイヤー' },
    ]);
  });

  it('流し始める位置を渡されなければ、どの曲も頭から', () => {
    createNiconicoPool(
      () => null,
      () => undefined,
    );
    expect(given[0].startAt?.('sm1')).toBeUndefined();
  });
});

describe('niconicoFrameTitle', () => {
  it('いまの住所の言語で返す', () => {
    expect(niconicoFrameTitle()).toBe('ニコニコ動画のプレイヤー');
    place.pathname = '/en/producers';
    expect(niconicoFrameTitle()).toBe('Niconico video player');
  });
});
