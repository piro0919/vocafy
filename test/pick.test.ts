import { describe, expect, it } from 'vitest';
import { isEligible, producersOf, sourcesOf, vocalistsOf } from '../scripts/lib/pick';
import type { VdbSong } from '../scripts/lib/vocadb';

const miku = { id: 1, name: '初音ミク', artistType: 'Vocaloid' };
const wowaka = { id: 53, name: 'wowaka', artistType: 'Producer' };

function song(over: Partial<VdbSong> = {}): VdbSong {
  return {
    id: 1501,
    name: 'ローリンガール',
    songType: 'Original',
    ratingScore: 3742,
    favoritedTimes: 821,
    artists: [
      { categories: 'Producer, Illustrator', isSupport: false, artist: wowaka, name: 'wowaka' },
      { categories: 'Vocalist', isSupport: false, artist: miku, name: '初音ミク' },
    ],
    pvs: [
      { service: 'NicoNicoDouga', pvType: 'Original', pvId: 'sm9714351' },
      { service: 'Youtube', pvType: 'Original', pvId: 'vnw8zURAxkU' },
    ],
    ...over,
  };
}

describe('sourcesOf', () => {
  it('YouTube とニコニコの本家を両方拾う', () => {
    expect(sourcesOf(song())).toEqual({ youtubeId: 'vnw8zURAxkU', niconicoId: 'sm9714351' });
  });

  it('転載は本家として使わない', () => {
    const s = song({ pvs: [{ service: 'Youtube', pvType: 'Reprint', pvId: 'x' }] });
    expect(sourcesOf(s)).toBeNull();
    expect(isEligible(s)).toBe(false);
  });

  it('消えた動画は使わない', () => {
    const s = song({
      pvs: [{ service: 'Youtube', pvType: 'Original', pvId: 'gone', disabled: true }],
    });
    expect(sourcesOf(s)).toBeNull();
  });

  it('ニコニコにしか本家が無い曲も入れる', () => {
    const s = song({ pvs: [{ service: 'NicoNicoDouga', pvType: 'Original', pvId: 'sm1' }] });
    expect(sourcesOf(s)).toEqual({ youtubeId: null, niconicoId: 'sm1' });
    expect(isEligible(s)).toBe(true);
  });
});

describe('vocalistsOf', () => {
  it('合成音声の歌声だけを拾う', () => {
    const s = song({
      artists: [
        ...song().artists!,
        // 人の歌い手と、歌声の欄に入ったイラストの人は入れない
        {
          categories: 'Vocalist',
          isSupport: false,
          artist: { id: 2, name: '人', artistType: 'OtherVocalist' },
          name: '人',
        },
        {
          categories: 'Vocalist',
          isSupport: false,
          artist: { id: 3, name: '絵', artistType: 'Illustrator' },
          name: '絵',
        },
      ],
    });
    expect(vocalistsOf(s).map((v) => v.name)).toEqual(['初音ミク']);
  });

  it('合成音声の歌声が無い曲は入れない', () => {
    const s = song({ artists: [song().artists![0]] });
    expect(isEligible(s)).toBe(false);
  });
});

describe('producersOf', () => {
  it('Producer の役割が付いた人だけを作者にする', () => {
    const s = song({
      artists: [
        ...song().artists!,
        {
          categories: 'Illustrator',
          isSupport: false,
          artist: { id: 9, name: '絵師', artistType: 'Illustrator' },
          name: '絵師',
        },
      ],
    });
    expect(producersOf(s).map((p) => p.name)).toEqual(['wowaka']);
  });
});
