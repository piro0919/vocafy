import { describe, expect, it } from 'vitest';
import { colorsOf } from '@/lib/cover-colors';
import { splitUrls } from '@/lib/split-urls';

/** 同じ色の点を n 個並べた、表紙の点の値 */
const pixels = (...runs: [number, number, number, number][]) =>
  runs.flatMap(([r, g, b, n]) => Array.from({ length: n }, () => [r, g, b, 255]).flat());

const hsl = (s: string) =>
  s
    .match(/hsl\((\d+) (\d+)% (\d+)%\)/)!
    .slice(1)
    .map(Number);

describe('colorsOf（表紙の色）', () => {
  it('ほぼ黒とほぼ白（左右の帯や余白）しか無ければ選ばない', () => {
    expect(colorsOf(pixels([0, 0, 0, 50], [250, 250, 250, 50]))).toBeNull();
  });

  it('一番多い色と、それと十分に離れた色を選ぶ。帯の黒は数えない', () => {
    const colors = colorsOf(pixels([0, 0, 0, 500], [200, 30, 30, 60], [30, 30, 200, 20]));
    expect(colors).not.toBeNull();
    const [first, second] = colors!.map(hsl);
    expect(first[0]).toBe(0);
    expect(second[0]).toBe(240);
  });

  it('文字が読めるよう、鮮やかさは65%まで、明るさは30〜45%に収める', () => {
    for (const [h, s, l] of colorsOf(pixels([255, 255, 0, 10], [40, 255, 40, 10]))!.map(hsl)) {
      expect(h).toBeGreaterThanOrEqual(0);
      expect(s).toBeLessThanOrEqual(65);
      expect(l).toBeGreaterThanOrEqual(30);
      expect(l).toBeLessThanOrEqual(45);
    }
  });

  it('色が1つしか無ければ、2つとも同じ色', () => {
    const [a, b] = colorsOf(pixels([200, 30, 30, 10]))!;
    expect(a).toBe(b);
  });
});

describe('splitUrls（説明文の URL）', () => {
  it('地の文と URL に分ける', () => {
    expect(splitUrls('配信 https://example.com/a?b=1 です')).toEqual([
      { text: '配信 ' },
      { text: 'https://example.com/a?b=1', href: 'https://example.com/a?b=1' },
      { text: ' です' },
    ]);
  });

  it('括弧と「」で URL の終わりとみなす', () => {
    expect(
      splitUrls('（https://x.jp/1）「http://y.jp」(https://z.jp)').filter((p) => p.href),
    ).toEqual([
      { text: 'https://x.jp/1', href: 'https://x.jp/1' },
      { text: 'http://y.jp', href: 'http://y.jp' },
      { text: 'https://z.jp', href: 'https://z.jp' },
    ]);
  });

  it('http(s) 以外はリンクにしない', () => {
    expect(splitUrls('javascript:alert(1) ftp://a')).toEqual([
      { text: 'javascript:alert(1) ftp://a' },
    ]);
  });

  it('ニコニコの曲では、番号の書き方もリンクにする', () => {
    expect(
      splitUrls('→sm9 mylist/4943376 user/1 nc184354 nm2 ar3', true).filter((p) => p.href),
    ).toEqual([
      { text: 'sm9', href: 'https://www.nicovideo.jp/watch/sm9' },
      { text: 'mylist/4943376', href: 'https://www.nicovideo.jp/mylist/4943376' },
      { text: 'user/1', href: 'https://www.nicovideo.jp/user/1' },
      { text: 'nc184354', href: 'https://commons.nicovideo.jp/works/nc184354' },
      { text: 'nm2', href: 'https://www.nicovideo.jp/watch/nm2' },
      { text: 'ar3', href: 'https://ch.nicovideo.jp/article/ar3' },
    ]);
  });

  it('URL の中・英数字に続く番号・コミュニティと、YouTube の曲ではリンクにしない', () => {
    expect(
      splitUrls('https://www.nicovideo.jp/watch/sm9 sm12mp3 xsm1 co386117', true).filter(
        (p) => p.href,
      ),
    ).toEqual([
      { text: 'https://www.nicovideo.jp/watch/sm9', href: 'https://www.nicovideo.jp/watch/sm9' },
    ]);
    expect(splitUrls('sm9')).toEqual([{ text: 'sm9' }]);
  });
});
