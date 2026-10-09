import { describe, expect, it } from 'vitest';
import {
  isEligible,
  isOwnVersion,
  linksOf,
  producersOf,
  sourcesOf,
  vocalistsOf,
} from '../scripts/lib/pick';
import type { VdbSong, VdbWebLink } from '../scripts/lib/vocadb';

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
    expect(sourcesOf(song())).toEqual({
      youtubeId: 'vnw8zURAxkU',
      niconicoId: 'sm9714351',
      niconicoThumb: null,
    });
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

  it('出し直しの版（リミックス・PV 版）も入れ、カバーは入れない', () => {
    expect(isEligible(song({ songType: 'Remix' }))).toBe(true);
    expect(isEligible(song({ songType: 'MusicPV' }))).toBe(true);
    expect(isEligible(song({ songType: 'Cover' }))).toBe(false);
  });

  it('ニコニコにしか本家が無い曲も入れる', () => {
    const s = song({
      pvs: [{ service: 'NicoNicoDouga', pvType: 'Original', pvId: 'sm1', thumbUrl: 'https://t/1' }],
    });
    expect(sourcesOf(s)).toEqual({
      youtubeId: null,
      niconicoId: 'sm1',
      niconicoThumb: 'https://t/1',
    });
    expect(isEligible(s)).toBe(true);
  });

  it('本家が消えた曲は、手で当てた動画を使う', () => {
    const s = song({
      id: 100515,
      pvs: [{ service: 'NicoNicoDouga', pvType: 'Original', pvId: 'sm1', disabled: true }],
    });
    expect(sourcesOf(s)).toEqual({
      youtubeId: 'IwvJUQzBjwE',
      niconicoId: null,
      niconicoThumb: null,
    });
    expect(isEligible(s)).toBe(true);
  });
});

describe('isOwnVersion', () => {
  const owners = (id: number) => (id === 1500 ? new Set([53]) : undefined);

  it('本人の出し直しは入れる', () => {
    expect(isOwnVersion(song({ songType: 'Remix', originalVersionId: 1500 }), owners)).toBe(true);
  });

  it('他人のリミックスは入れない', () => {
    const dj = { id: 9, name: 'DJ', artistType: 'Producer' };
    const s = song({
      songType: 'Remix',
      originalVersionId: 1500,
      artists: [
        ...song().artists!,
        { categories: 'Producer', isSupport: false, artist: dj, name: 'DJ' },
      ],
    });
    expect(isOwnVersion(s, owners)).toBe(false);
  });

  it('元の曲が分からない出し直しは入れない', () => {
    expect(isOwnVersion(song({ songType: 'Remaster', originalVersionId: 7 }), owners)).toBe(false);
    expect(isOwnVersion(song({ songType: 'Remaster' }), owners)).toBe(false);
  });

  it('sped up・短い版・インスト・ライブは入れず、曲名に live を含むだけの曲は入れる', () => {
    const v = (name: string) => song({ name, songType: 'Remix', originalVersionId: 1500 });
    expect(isOwnVersion(v('ゲンチアナ (Sped UP)'), owners)).toBe(false);
    expect(isOwnVersion(v('SHIAWASE FOR YOU! (short ver.)'), owners)).toBe(false);
    expect(isOwnVersion(v('月夜の乙女 (piano inst.)'), owners)).toBe(false);
    expect(
      isOwnVersion(v('砂の惑星-初音ミク「マジカルミライ」10th Anniversary Live-'), owners),
    ).toBe(false);
    expect(isOwnVersion(v('刹月華 (2018 LiveVer.)'), owners)).toBe(false);
    expect(isOwnVersion(v('Prayer Will Live'), owners)).toBe(true);
    expect(isOwnVersion(v('impure (Reverberations3 Remix)'), owners)).toBe(true);
    expect(isOwnVersion(v('AGAINST'), owners)).toBe(true);
  });

  it('オリジナル曲はそのまま入れる', () => {
    expect(isOwnVersion(song(), owners)).toBe(true);
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
  it('作者に誤って入っている人は拾わない', () => {
    const narita = { id: 926, name: '成田旬', artistType: 'Producer' };
    const s = song({
      id: 949313,
      artists: [
        ...song().artists!,
        { categories: 'Producer', isSupport: false, artist: narita, name: '成田旬' },
      ],
    });
    expect(producersOf(s).map((p) => p.id)).toEqual([53]);
  });

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

  it('調声などを手伝った補助の人は作者にしない', () => {
    const s = song({
      artists: [
        ...song().artists!,
        {
          categories: 'Producer',
          isSupport: true,
          artist: { id: 23966, name: 'Unknown producer(s)', artistType: 'Producer' },
          name: 'Unknown producer(s)',
        },
      ],
    });
    expect(producersOf(s).map((p) => p.name)).toEqual(['wowaka']);
  });
});

describe('linksOf', () => {
  const link = (description: string, url: string, over: Partial<VdbWebLink> = {}): VdbWebLink => ({
    category: 'Official',
    description,
    url,
    disabled: false,
    ...over,
  });

  it('サービスごとに1本だけ選び、素の説明のものを先に使う', () => {
    expect(
      linksOf([
        link('Website', 'https://deco27.com/'),
        link('Twitter', 'https://twitter.com/DECO27'),
        link('NND Mylist', 'https://www.nicovideo.jp/mylist/9850666'),
        link('NND Account', 'http://www.nicovideo.jp/user/811012'),
        link(
          'YouTube Channel (auto-generated by YouTube)',
          'https://www.youtube.com/channel/UCEAh',
        ),
        link('YouTube Channel (Custom - @)', 'https://www.youtube.com/@DECO27'),
        link('YouTube Channel', 'https://www.youtube.com/channel/UCGmO/videos?app=desktop'),
      ]),
    ).toEqual({
      x: 'https://x.com/DECO27',
      youtube: 'https://www.youtube.com/channel/UCGmO',
      niconico: 'https://www.nicovideo.jp/user/811012',
      website: 'https://deco27.com/',
    });
  });

  it('閉じたリンク・本人の場所でないリンク・昔のサイトは使わない', () => {
    expect(
      linksOf([
        link('Website', 'https://old.example.com/', { disabled: true }),
        link('Website (old)', 'http://example.fc2.com/'),
        link('Twitter', 'https://twitter.com/someone', { category: 'Reference' }),
        link('Website', 'https://www.pixiv.net/users/1'),
      ]),
    ).toEqual({});
  });

  it('アカウントが無ければマイリストを使う', () => {
    expect(linksOf([link('NND MyList', 'http://www.nicovideo.jp/mylist/2532792')])).toEqual({
      niconico: 'https://www.nicovideo.jp/mylist/2532792',
    });
  });
});
