import { beforeEach, describe, expect, it, vi } from 'vitest';
import { buildOrder } from '@/components/player/play-order';
import { isHomePath } from '@/lib/home-path';
import { leave } from '@/lib/leave';
import { arrived, markReplace, navigationDepth, setNavigationDepth } from '@/lib/navigation-state';
import { producerName } from '@/lib/producer-name';
import { dayTitle, monthTitle, voiceYearTitle, withPickup } from '@/lib/list-titles';
import { frameOf, smallThumbOf, thumbOf } from '@/lib/thumb';
import { voiceName, voiceNamesText } from '@/lib/voice-name';
import { vocalistNames } from '@/lib/vocalist-names';

/** テストの中だけの localStorage（node には無い） */
const store = new Map<string, string>();
vi.stubGlobal('localStorage', {
  getItem: (key: string) => store.get(key) ?? null,
  setItem: (key: string, value: string) => store.set(key, String(value)),
  removeItem: (key: string) => store.delete(key),
});
const { savedPlayback, savePlayback, savedVolume, saveVolume, savedDockSide } =
  await import('@/components/player/player-storage');

beforeEach(() => store.clear());

describe('buildOrder（流す順）', () => {
  it('ランダムでなければ並びどおり', () => {
    expect(buildOrder(4, 2, false)).toEqual([0, 1, 2, 3]);
  });

  it('ランダムなら選んだ曲を先頭にし、残りを1回ずつ混ぜる', () => {
    for (let i = 0; i < 20; i++) {
      const order = buildOrder(6, 3, true);
      expect(order[0]).toBe(3);
      expect([...order].sort()).toEqual([0, 1, 2, 3, 4, 5]);
    }
  });

  it('1曲・0曲の並び', () => {
    expect(buildOrder(1, 0, true)).toEqual([0]);
    expect(buildOrder(0, 0, false)).toEqual([]);
  });
});

describe('音量・ループ・ランダムの保存', () => {
  it('何も残っていなければ、ループは全体・ランダムは切・音量 100', () => {
    expect(savedPlayback()).toEqual({ repeat: 'all', shuffle: false });
    expect(savedVolume()).toEqual({ volume: 100, muted: false });
  });

  it('残した値を読み戻す', () => {
    savePlayback({ repeat: 'one', shuffle: true });
    saveVolume(35, true);
    expect(savedPlayback()).toEqual({ repeat: 'one', shuffle: true });
    expect(savedVolume()).toEqual({ volume: 35, muted: true });
  });

  it('壊れた値・範囲の外の音量は、既定か範囲の端にする', () => {
    store.set('vocafy-playback', '{');
    store.set('vocafy-volume', JSON.stringify({ volume: 150, muted: 'yes' }));
    expect(savedPlayback()).toEqual({ repeat: 'all', shuffle: false });
    expect(savedVolume()).toEqual({ volume: 100, muted: false });
    store.set('vocafy-volume', JSON.stringify({ volume: -5 }));
    expect(savedVolume().volume).toBe(0);
    store.set('vocafy-playback', JSON.stringify({ repeat: 'none', shuffle: 1 }));
    expect(savedPlayback()).toEqual({ repeat: 'all', shuffle: false });
  });

  it('窓を寄せる側は、left のときだけ左', () => {
    expect(savedDockSide()).toBe('right');
    store.set('vocafy-dock-side', 'left');
    expect(savedDockSide()).toBe('left');
    store.set('vocafy-dock-side', 'top');
    expect(savedDockSide()).toBe('right');
  });
});

describe('表紙の住所', () => {
  it('大きな表紙と途中のコマは mq の形', () => {
    expect(thumbOf('abc')).toBe('https://i.ytimg.com/vi/abc/mqdefault.jpg');
    expect(frameOf('abc', 2)).toBe('https://i.ytimg.com/vi/abc/mq2.jpg');
  });

  it('一覧の小さな表紙は、YouTube なら default、ニコニコならいまの表紙', () => {
    expect(smallThumbOf({ service: 'youtube', videoId: 'abc', thumb: 'x' })).toBe(
      'https://i.ytimg.com/vi/abc/default.jpg',
    );
    expect(smallThumbOf({ service: 'niconico', videoId: 'sm1', thumb: 'nico.jpg' })).toBe(
      'nico.jpg',
    );
  });
});

describe('歌声の名前', () => {
  const names = { 初音ミク: 'Hatsune Miku', GUMI: 'GUMI' };

  it('「・」でつないだ歌声を名前の並びにする（前後の空白は外す）', () => {
    expect(vocalistNames('初音ミク・ 鏡音リン ')).toEqual(['初音ミク', '鏡音リン']);
  });

  it('英語の画面では表で引き、表に無い名前は日本語のまま', () => {
    expect(voiceName('初音ミク', names)).toBe('Hatsune Miku');
    expect(voiceName('重音テト', names)).toBe('重音テト');
    expect(voiceNamesText('初音ミク・重音テト', names)).toBe('Hatsune Miku・重音テト');
  });

  it('日本語の画面（表が null）と空の歌声はそのまま', () => {
    expect(voiceNamesText('初音ミク・GUMI', null)).toBe('初音ミク・GUMI');
    expect(voiceNamesText('', names)).toBe('');
  });
});

describe('一覧の題名', () => {
  it('日付の一覧の題名を言語ごとに作る（先頭の 0 は外す）', () => {
    expect(dayTitle('10-09', 'ja')).toBe('10月9日に生まれた曲');
    expect(dayTitle('01-31', 'en')).toBe('Born on January 31');
  });

  it('月の一覧と、歌声の年の一覧の題名', () => {
    expect(monthTitle('2010', 3, 'ja')).toBe('2010年3月の曲');
    expect(monthTitle('2010', 3, 'en')).toMatch(/2010/);
    expect(voiceYearTitle('初音ミク', '2010', 'ja')).toBe('初音ミクの2010年の曲');
    expect(voiceYearTitle('Hatsune Miku', '2010', 'en')).toBe('Hatsune Miku in 2010');
  });

  it('選んだ曲を流すときだけ PICKUP を添える', () => {
    expect(withPickup('2026', true)).toBe('2026 PICKUP');
    expect(withPickup('2026', false)).toBe('2026');
  });
});

describe('動画の画面から戻る（leave）', () => {
  const router = () => ({ back: vi.fn(), push: vi.fn() });

  /** 「戻る」で popstate が来るかを選べる window */
  const stubWindow = (pops: boolean) => {
    const target = new EventTarget();
    // localStorage の差し替えは残したいので、vi.stubGlobal を使わず window だけを置いて、終わったら外す
    Object.assign(globalThis, { window: target });
    return () => {
      if (pops) target.dispatchEvent(new Event('popstate'));
    };
  };

  it('サイトの中で進んでいれば「戻る」', () => {
    vi.useFakeTimers();
    const pop = stubWindow(true);
    const r = router();
    r.back.mockImplementation(pop);
    setNavigationDepth(2);
    leave(r as unknown as Parameters<typeof leave>[0]);
    vi.runAllTimers();
    expect(r.back).toHaveBeenCalledTimes(1);
    expect(r.push).not.toHaveBeenCalled();
    vi.useRealTimers();
    Reflect.deleteProperty(globalThis, 'window');
  });

  it('「戻る」で履歴が動かなければ、トップへ', () => {
    vi.useFakeTimers();
    stubWindow(false);
    const r = router();
    setNavigationDepth(2);
    leave(r as unknown as Parameters<typeof leave>[0]);
    vi.runAllTimers();
    expect(r.back).toHaveBeenCalledTimes(1);
    expect(r.push).toHaveBeenCalledWith('/');
    vi.useRealTimers();
    Reflect.deleteProperty(globalThis, 'window');
  });

  it('いきなりこの画面に来たときは、サイトの外へ戻さずトップへ', () => {
    const r = router();
    setNavigationDepth(0);
    leave(r as unknown as Parameters<typeof leave>[0]);
    expect(r.push).toHaveBeenCalledWith('/');
    expect(r.back).not.toHaveBeenCalled();
  });
});

describe('isHomePath（トップの画面か）', () => {
  it('`/` と、中身を返す日付と時のページはトップ', () => {
    expect(isHomePath('/')).toBe(true);
    expect(isHomePath('/home/2026-10-12/9')).toBe(true);
  });

  it('ほかの画面はトップでない', () => {
    expect(isHomePath('/producers')).toBe(false);
    expect(isHomePath('/homes')).toBe(false);
  });
});

describe('pageOf（住所の末尾のページ番号）', () => {
  it('番号が無ければ1ページ目、2以上の番号はそのページ', async () => {
    const { pageOf } = await import('@/components/pager');
    expect(pageOf(undefined)).toBe(1);
    expect(pageOf([])).toBe(1);
    expect(pageOf(['2'])).toBe(2);
    expect(pageOf(['35'])).toBe(35);
  });

  it('1 と書いた住所・数字でないもの・先頭が 0・段が多いものは無いページ', async () => {
    const { pageOf } = await import('@/components/pager');
    for (const segments of [['1'], ['0'], ['02'], ['x'], ['2', '3'], ['1.5']]) {
      expect(pageOf(segments)).toBeNull();
    }
  });
});

describe('singerOfVocalists（色を変えるキャラ）', () => {
  it('先に名前の出てくる、色のあるキャラ', async () => {
    const { singerOfVocalists } = await import('@/components/theme/voice');
    expect(singerOfVocalists('初音ミク・鏡音リン')).toBe('初音ミク');
    expect(singerOfVocalists('歌手不明・重音テト')).toBe('重音テト');
  });

  it('色のあるキャラがいなければ null（表にある名前でも、継いだ性質の名前は拾わない）', async () => {
    const { singerOfVocalists } = await import('@/components/theme/voice');
    expect(singerOfVocalists('歌手不明')).toBeNull();
    expect(singerOfVocalists('')).toBeNull();
    expect(singerOfVocalists('toString')).toBeNull();
  });
});

describe('artworkOf（Vocafy Visualizer に送る表紙の候補）', () => {
  it('YouTube は大きい版から順に', async () => {
    const { artworkOf } = await import('@/components/visualizer/artwork');
    expect(artworkOf({ service: 'youtube', videoId: 'abc', thumb: '' })).toEqual([
      'https://i.ytimg.com/vi/abc/maxresdefault.jpg',
      'https://i.ytimg.com/vi/abc/hqdefault.jpg',
      'https://i.ytimg.com/vi/abc/mqdefault.jpg',
    ]);
  });

  it('ニコニコの新しい表紙は、付いている .M を外してから大・中の版にする', async () => {
    const { artworkOf } = await import('@/components/visualizer/artwork');
    const base = 'https://nicovideo.cdn.nimg.jp/thumbnails/27040863/27040863.22386852';
    expect(artworkOf({ service: 'niconico', videoId: 'sm1', thumb: `${base}.M` })).toEqual([
      `${base}.L`,
      `${base}.M`,
    ]);
  });

  it('ニコニコの古い表紙（大・中の版が無い）は、そのまま', async () => {
    const { artworkOf } = await import('@/components/visualizer/artwork');
    const thumb = 'https://nicovideo.cdn.nimg.jp/thumbnails/1961633/1961633';
    expect(artworkOf({ service: 'niconico', videoId: 'sm1', thumb })).toEqual([thumb]);
  });
});

describe('arrived（住所が変わったときの数え方）', () => {
  it('ふつうの移動は1つ進め、戻る・進む（popped）は1つ戻す。0 より下には行かない', () => {
    setNavigationDepth(0);
    arrived('/years', false);
    arrived('/producers/45', false);
    expect(navigationDepth()).toBe(2);
    arrived('/years', true);
    expect(navigationDepth()).toBe(1);
    arrived('/', true);
    arrived('/', true);
    expect(navigationDepth()).toBe(0);
  });

  it('置き換えで移った先に着いたときは数えず、印は一度で外れる', () => {
    setNavigationDepth(0);
    markReplace('/producers/45', '/');
    arrived('/producers/45', false);
    expect(navigationDepth()).toBe(0);
    arrived('/producers/45', false);
    expect(navigationDepth()).toBe(1);
  });

  it('住所の変わらない置き換え（検索の ?q=）は覚えない', () => {
    setNavigationDepth(0);
    markReplace('/search', '/search');
    arrived('/search', false);
    expect(navigationDepth()).toBe(1);
  });
});

describe('producerName（英語の画面のボカロPの名前）', () => {
  it('英語の名前の表にあればそれ、無ければ日本語のまま。日本語の画面（null）はそのまま', () => {
    const names = { 45: 'DECO*27' };
    expect(producerName(45, 'ＤＥＣＯ＊２７', names)).toBe('DECO*27');
    expect(producerName(7, 'ハチ', names)).toBe('ハチ');
    expect(producerName(45, 'ＤＥＣＯ＊２７', null)).toBe('ＤＥＣＯ＊２７');
  });
});
