import { describe, expect, it } from 'vitest';
import {
  accountsOf,
  arrangedOnly,
  dropSharedVideos,
  isEligible,
  isOwnVersion,
  linksOf,
  markUploaders,
  originalVideos,
  producersOf,
  sourcesOf,
  versionVideos,
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
      youtubeTopic: false,
      niconicoId: 'sm9714351',
      niconicoThumb: null,
    });
  });

  it('YouTube の本家が何本かあれば、Topic でない動画（MV）を選ぶ', () => {
    const s = song({
      pvs: [
        { service: 'Youtube', pvType: 'Original', pvId: 'topic', author: 'TAK - Topic' },
        { service: 'Youtube', pvType: 'Original', pvId: 'mv', author: 'TAK / DORIDORI' },
      ],
    });
    expect(sourcesOf(s)).toMatchObject({ youtubeId: 'mv', youtubeTopic: false });
  });

  it('YouTube の本家が Topic だけなら、それを選んで印を立てる', () => {
    const s = song({
      pvs: [
        { service: 'NicoNicoDouga', pvType: 'Original', pvId: 'sm2500648' },
        { service: 'Youtube', pvType: 'Original', pvId: 'topic', author: 'Toraboruta - Topic' },
      ],
    });
    expect(sourcesOf(s)).toMatchObject({
      youtubeId: 'topic',
      youtubeTopic: true,
      niconicoId: 'sm2500648',
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
      youtubeTopic: false,
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
      youtubeTopic: false,
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

describe('producersOf の役割', () => {
  const credit = (id: number, name: string, effectiveRoles: string) => ({
    categories: 'Producer',
    isSupport: false,
    effectiveRoles,
    artist: { id, name, artistType: 'Producer' },
    name,
  });

  it('編曲・調声だけで載った人は作者にしない', () => {
    const s = song({
      artists: [
        credit(45, 'DECO＊27', 'Arranger, Composer, Lyricist'),
        credit(179, 'emon(Tes.)', 'Arranger'),
        credit(3, '調声の人', 'VoiceManipulator'),
        { categories: 'Vocalist', isSupport: false, artist: miku, name: '初音ミク' },
      ],
    });
    expect(producersOf(s).map((p) => p.name)).toEqual(['DECO＊27']);
  });

  it('作詞だけの人と、役割が既定の人は作者にする', () => {
    const s = song({
      artists: [credit(1, '作曲', 'Default'), credit(2, '作詞', 'Lyricist')],
    });
    expect(producersOf(s).map((p) => p.name)).toEqual(['作曲', '作詞']);
  });

  it('作曲・作詞の人が1人もいない曲は、Producer の人を全員作者にする', () => {
    const s = song({
      artists: [
        credit(1, 'ぬゆり', 'Arranger, Instrumentalist, VoiceManipulator'),
        credit(2, 'バルーン', 'Arranger, VoiceManipulator'),
      ],
    });
    expect(producersOf(s).map((p) => p.name)).toEqual(['ぬゆり', 'バルーン']);
  });
});

describe('編曲だけの人と本家の動画', () => {
  const credit = (id: number, name: string, effectiveRoles: string) => ({
    categories: 'Producer',
    isSupport: false,
    effectiveRoles,
    artist: { id, name, artistType: 'Producer' },
    name,
  });
  // 制空権。作曲・作詞はアキバヲタPで、ずきおは編曲だけ。動画はずきおが上げた
  const seikuken = song({
    id: 44945,
    artists: [
      credit(2954, 'ずきお', 'Arranger'),
      credit(415, 'アキバヲタP', 'Composer, Lyricist'),
      credit(5658, 'びび', 'VoiceManipulator'),
      { categories: 'Vocalist', isSupport: false, artist: miku, name: '初音ミク' },
    ],
  });

  it('編曲だけで載り、作者から外れている人を見分ける', () => {
    expect(arrangedOnly(seikuken, 2954)).toBe(true);
    expect(arrangedOnly(seikuken, 415)).toBe(false);
    // 調声だけの人は確かめない
    expect(arrangedOnly(seikuken, 5658)).toBe(false);
  });

  it('作曲・作詞の人がいない曲の編曲の人は、もう作者なので確かめない', () => {
    const s = song({ artists: [credit(1, 'ぬゆり', 'Arranger')] });
    expect(arrangedOnly(s, 1)).toBe(false);
  });

  it('動画を上げたと確かめた人は作者にする。元の曲は書き換えない', () => {
    const marked = markUploaders(seikuken, new Set([2954]));
    expect(producersOf(marked).map((p) => p.name)).toEqual(['ずきお', 'アキバヲタP']);
    expect(arrangedOnly(marked, 2954)).toBe(false);
    expect(producersOf(seikuken).map((p) => p.name)).toEqual(['アキバヲタP']);
  });

  it('本家の動画を YouTube とニコニコで拾う。転載は拾わない', () => {
    const s = song({
      pvs: [
        { service: 'NicoNicoDouga', pvType: 'Original', pvId: 'nm22446967' },
        { service: 'Youtube', pvType: 'Reprint', pvId: 'x' },
        { service: 'Piapro', pvType: 'Original', pvId: 'y' },
      ],
    });
    expect(originalVideos(s)).toEqual([{ service: 'niconico', id: 'nm22446967' }]);
  });

  it('アカウントは Official 以外や閉じたリンクからも拾い、YouTube の名前は分けて持つ', () => {
    const link = (url: string, over: Partial<VdbWebLink> = {}): VdbWebLink => ({
      category: 'Official',
      description: '',
      url,
      disabled: false,
      ...over,
    });
    expect(
      accountsOf([
        link('http://www.nicovideo.jp/user/4093028', { disabled: true }),
        link('https://www.youtube.com/channel/UCQS8TAEfaDhnU-L5oZ5Mj5A/videos'),
        link('https://www.youtube.com/@%E3%81%9A%E3%81%8D%E3%81%8A', { category: 'Other' }),
        link('https://www.youtube.com/user/deco27'),
        link('https://x.com/mzkch_'),
      ]),
    ).toEqual({
      youtube: ['UCQS8TAEfaDhnU-L5oZ5Mj5A'],
      youtubeNames: ['@ずきお', 'user/deco27'],
      niconico: ['4093028'],
    });
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

describe('dropSharedVideos（同じ動画は1曲にだけ使う）', () => {
  const yt = (pvId: string) => [{ service: 'Youtube', pvType: 'Original', pvId }];
  const original = song({ id: 1, pvs: yt('a') });
  const older = song({ id: 2, songType: 'Remix', publishDate: '2015-01-01', pvs: yt('b') });
  const newer = song({ id: 3, songType: 'Remix', publishDate: '2020-01-01', pvs: yt('b') });
  const sameAsOriginal = song({
    id: 4,
    songType: 'Remix',
    publishDate: '2010-01-01',
    pvs: yt('a'),
  });
  const ids = (songs: { id: number }[]) => songs.map((s) => s.id);

  it('出し直しの版が元の曲と同じ動画なら、版を外す（オリジナル曲が先に取る）', () => {
    expect(ids(dropSharedVideos([sameAsOriginal, original], new Set()))).toEqual([1]);
  });

  it('出し直しの版どうしは、古いものが動画を取る。並びは渡した順のまま', () => {
    expect(ids(dropSharedVideos([newer, original, older], new Set()))).toEqual([1, 2]);
  });

  it('DB のほかの曲がもう使っている動画の出し直しの版は外す。オリジナル曲は外さない', () => {
    expect(ids(dropSharedVideos([original, older], new Set(['a', 'b'])))).toEqual([1]);
  });

  it('DB を引くのは出し直しの版の動画だけ', () => {
    expect(versionVideos([original, older])).toEqual(['b']);
  });
});
