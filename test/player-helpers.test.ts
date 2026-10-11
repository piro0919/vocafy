import { beforeEach, describe, expect, it, vi } from 'vitest';
import { buildOrder } from '@/components/player/play-order';
import { isHomePath } from '@/lib/home-path';
import { leave, setNavigationDepth } from '@/lib/leave';
import { dayTitle, withPickup } from '@/lib/list-titles';
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

  it('選んだ曲を流すときだけ PICKUP を添える', () => {
    expect(withPickup('2026', true)).toBe('2026 PICKUP');
    expect(withPickup('2026', false)).toBe('2026');
  });
});

describe('動画の画面から戻る（leave）', () => {
  const router = () => ({ back: vi.fn(), push: vi.fn() });

  it('サイトの中で進んでいれば「戻る」', () => {
    const r = router();
    setNavigationDepth(2);
    leave(r as unknown as Parameters<typeof leave>[0]);
    expect(r.back).toHaveBeenCalledTimes(1);
    expect(r.push).not.toHaveBeenCalled();
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
