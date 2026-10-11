import { describe, expect, it } from 'vitest';
import { favoriteSinger, singerLayout } from '@/app/producers/[id]/og-layout';

describe('favoriteSinger（ボカロPの絵のキャラ）', () => {
  const hasArt = (name: string) => name !== 'VY1';

  it('一番多くの曲で歌っている、絵のあるキャラ', () => {
    const songs = [
      { vocalists: ['VY1'] },
      { vocalists: ['VY1'] },
      { vocalists: ['GUMI', '初音ミク'] },
      { vocalists: ['初音ミク'] },
    ];
    expect(favoriteSinger(songs, hasArt)).toBe('初音ミク');
  });

  it('同じ数なら先に出てきた人。同じ曲の中の重なりは1曲と数える', () => {
    const songs = [{ vocalists: ['GUMI', 'GUMI', 'GUMI'] }, { vocalists: ['初音ミク'] }];
    expect(favoriteSinger(songs, hasArt)).toBe('GUMI');
  });

  it('絵のあるキャラがいなければ null', () => {
    expect(favoriteSinger([{ vocalists: ['VY1'] }], hasArt)).toBeNull();
  });
});

describe('singerLayout（影絵の並べ方）', () => {
  it('1人なら高さ 480 で右端に', () => {
    expect(singerLayout([{ width: 300, height: 400 }])).toEqual({
      width: 360,
      height: 480,
      placements: [{ x: 0, width: 360 }],
    });
  });

  it('2人は同じ高さ（400）で、2人目を1人目の左隣に少し重ねて置く', () => {
    expect(
      singerLayout([
        { width: 300, height: 400 },
        { width: 200, height: 400 },
      ]),
    ).toEqual({
      width: 476,
      height: 400,
      placements: [
        { x: 176, width: 300 },
        { x: 0, width: 200 },
      ],
    });
  });

  it('2人の幅が 680 を超えるときは、2人目を1人目の後ろに重ねて 680 に収める', () => {
    const layout = singerLayout([
      { width: 600, height: 400 },
      { width: 600, height: 400 },
    ]);
    expect(layout?.width).toBe(680);
    expect(layout?.placements).toEqual([
      { x: 80, width: 600 },
      { x: 0, width: 600 },
    ]);
  });

  it('キャラがいなければ null', () => {
    expect(singerLayout([])).toBeNull();
  });
});
