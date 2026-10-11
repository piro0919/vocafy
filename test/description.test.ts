import { afterEach, describe, expect, it, vi } from 'vitest';
import { GET } from '@/app/api/description/[service]/[id]/route';
import { decodeEntities, htmlToText } from '@/lib/description-text';

describe('decodeEntities', () => {
  it('名前付き・10進・16進の文字参照を戻す', () => {
    expect(decodeEntities('&lt;a&gt; &quot;x&quot; &#39;y&#39; &#12354; &#x3042;')).toBe(
      `<a> "x" 'y' あ あ`,
    );
  });

  it('二重に包まれた参照は1段だけ戻す', () => {
    expect(decodeEntities('&amp;lt;')).toBe('&lt;');
  });

  it('範囲外の番号は落ちずにそのまま残す', () => {
    expect(decodeEntities('&#99999999; &#x110000;')).toBe('&#99999999; &#x110000;');
  });
});

describe('htmlToText', () => {
  it('改行だけ残してタグを外す', () => {
    expect(htmlToText('一行目<br>二行目<BR/><a href="x">リンク</a>')).toBe(
      '一行目\n二行目\nリンク',
    );
  });
});

describe('/api/description', () => {
  const call = (service: string, id: string) =>
    GET(new Request('http://localhost/api/description'), {
      params: Promise.resolve({ service, id }),
    } as Parameters<typeof GET>[1]);

  afterEach(() => vi.unstubAllGlobals());

  it('形の違う番号は 400 で、外には聞かない', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    for (const [service, id] of [
      ['youtube', 'x'],
      ['youtube', '../../etc'],
      ['niconico', 'abc'],
      ['vimeo', 'abcdefghijk'],
    ]) {
      expect((await call(service, id)).status).toBe(400);
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('窓口につながらないときは空の文字列', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Promise.reject(new Error('offline'))),
    );
    const res = await call('niconico', 'sm9');
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ text: '' });
  });

  it('ニコニコは埋め込みのページの説明文を、改行を残して返す', async () => {
    const props = JSON.stringify({ description: '歌詞<br>二行目' }).replace(/"/g, '&quot;');
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(`<div data-props="${props}"></div>`)),
    );
    expect(await (await call('niconico', 'sm9')).json()).toEqual({ text: '歌詞\n二行目' });
  });
});
