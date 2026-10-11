import { describe, expect, it } from 'vitest';
import { songParam } from '@/components/player/use-song-in-url';

describe('songParam', () => {
  it('住所の ?song= の曲の id を読む', () => {
    expect(songParam('?song=112085')).toBe(112085);
    expect(songParam('?x=1&song=8478')).toBe(8478);
  });

  it('無いか形が違えば null', () => {
    expect(songParam('')).toBeNull();
    expect(songParam('?song=')).toBeNull();
    expect(songParam('?song=abc')).toBeNull();
    expect(songParam('?song=-3')).toBeNull();
    expect(songParam('?song=1.5')).toBeNull();
    expect(songParam('?song=99999999999999999999')).toBeNull();
  });
});
