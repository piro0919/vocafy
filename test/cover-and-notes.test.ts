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
      { text: 'https://example.com/a?b=1', url: true },
      { text: ' です' },
    ]);
  });

  it('括弧と「」で URL の終わりとみなす', () => {
    expect(
      splitUrls('（https://x.jp/1）「http://y.jp」(https://z.jp)').filter((p) => p.url),
    ).toEqual([
      { text: 'https://x.jp/1', url: true },
      { text: 'http://y.jp', url: true },
      { text: 'https://z.jp', url: true },
    ]);
  });

  it('http(s) 以外はリンクにしない', () => {
    expect(splitUrls('javascript:alert(1) ftp://a')).toEqual([
      { text: 'javascript:alert(1) ftp://a' },
    ]);
  });
});
