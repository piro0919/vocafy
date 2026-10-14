import { afterEach, describe, expect, it, vi } from 'vitest';
import { googleFont, roundedFonts } from '@/app/[lang]/og-backdrop';

const FONT_URL = 'https://fonts.gstatic.com/l/font?kit=x';

/** Google Fonts の CSS と、フォントの住所の返事を偽る。fontStatus でフォントの住所の状態を変える */
function mockGoogle(fontStatus: (family: string) => number) {
  const calls: { family: string; text: string }[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string) => {
      const url = new URL(input);
      if (url.host === 'fonts.googleapis.com') {
        const family = (url.searchParams.get('family') ?? '').split(':')[0];
        calls.push({ family, text: url.searchParams.get('text') ?? '' });
        return new Response(
          `@font-face { src: url(${FONT_URL}&f=${encodeURIComponent(family)}) format('truetype'); }`,
        );
      }
      const family = url.searchParams.get('f') ?? '';
      const status = fontStatus(family);
      return status === 200
        ? new Response(new Uint8Array([0, 1, 0, 0]))
        : new Response('<html></html>', { status, headers: { 'content-type': 'text/html' } });
    }),
  );
  return calls;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('googleFont（共有の絵の書体）', () => {
  it('書体に字が無くフォントの住所が 400 なら、HTML をフォントとして返さず null（VOCAFY-6）', async () => {
    mockGoogle(() => 400);
    expect(await googleFont('M PLUS Rounded 1c', 800, '박화애')).toBeNull();
  });

  it('ほかの失敗は投げる', async () => {
    mockGoogle(() => 500);
    await expect(googleFont('M PLUS Rounded 1c', 800, 'あ')).rejects.toThrow();
  });
});

describe('roundedFonts（字の書体と補い）', () => {
  it('ハングルだけの名前は Noto Sans KR だけで取る', async () => {
    const calls = mockGoogle((family) => (family === 'Noto Sans KR' ? 200 : 400));
    const fonts = await roundedFonts('Rounded', 800, '박화애');
    expect(fonts.map((f) => f.name)).toEqual(['RoundedKorean']);
    expect(calls).toEqual([{ family: 'Noto Sans KR', text: '박화애' }]);
  });

  it('ハングルと日本語が混ざれば、日本語は M PLUS Rounded 1c、ハングルは Noto Sans KR', async () => {
    const calls = mockGoogle(() => 200);
    const fonts = await roundedFonts('Rounded', 800, '박화애と初音ミク');
    expect(fonts.map((f) => f.name)).toEqual(['Rounded', 'RoundedKorean']);
    expect(calls).toContainEqual({ family: 'M PLUS Rounded 1c', text: 'と初音ミク' });
    expect(calls).toContainEqual({ family: 'Noto Sans KR', text: '박화애' });
  });

  it('どちらの書体にも字が無くても投げない', async () => {
    mockGoogle(() => 400);
    expect(await roundedFonts('Rounded', 800, 'ภาษาไทย')).toEqual([]);
  });
});
