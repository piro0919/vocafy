import { afterEach, describe, expect, it, vi } from 'vitest';

// unplayable.ts は読み込んだときに DATABASE_URL を確かめる。ここでは DB に触らないので、使わない値で通す
vi.hoisted(() => {
  process.env.DATABASE_URL = 'postgres://unused';
});

const { isPlayable } = await import('@/lib/unplayable');

/** 住所ごとに返す状態と本文を決めて、外の窓口を差し替える */
function stubFetch(routes: Record<string, { status: number; body?: string } | Error>) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => {
      const hit = Object.entries(routes).find(([prefix]) => url.startsWith(prefix))?.[1];
      if (!hit) throw new Error(`想定していない問い合わせ: ${url}`);
      if (hit instanceof Error) throw hit;
      return new Response(hit.body ?? '', { status: hit.status });
    }),
  );
}

const OEMBED = 'https://www.youtube.com/oembed';
const THUMB = 'https://ext.nicovideo.jp/api/getthumbinfo/';
const EMBED = 'https://embed.nicovideo.jp/watch/';
const OK_XML = '<nicovideo_thumb_response status="ok"><embeddable>1</embeddable>';

afterEach(() => vi.unstubAllGlobals());

describe('isPlayable（YouTube）', () => {
  it('oEmbed が返れば流せる', async () => {
    stubFetch({ [OEMBED]: { status: 200 } });
    expect(await isPlayable('youtube', 'abcdefghijk')).toBe(true);
  });

  it('401・403・404 なら流せない', async () => {
    for (const status of [401, 403, 404]) {
      stubFetch({ [OEMBED]: { status } });
      expect(await isPlayable('youtube', 'abcdefghijk')).toBe(false);
    }
  });

  it('混み合い（429・500）とつながらないときは、分からない（外さない）', async () => {
    for (const route of [{ status: 429 }, { status: 500 }, new Error('offline')]) {
      stubFetch({ [OEMBED]: route });
      expect(await isPlayable('youtube', 'abcdefghijk')).toBeNull();
    }
  });
});

describe('isPlayable（ニコニコ）', () => {
  it('動画があって埋め込めて、埋め込みのページが開けば流せる', async () => {
    stubFetch({ [THUMB]: { status: 200, body: OK_XML }, [EMBED]: { status: 200 } });
    expect(await isPlayable('niconico', 'sm1')).toBe(true);
  });

  it('動画が無い（status="fail"）か、埋め込めない（embeddable が 0）なら流せない', async () => {
    stubFetch({ [THUMB]: { status: 200, body: '<nicovideo_thumb_response status="fail">' } });
    expect(await isPlayable('niconico', 'sm1')).toBe(false);
    stubFetch({ [THUMB]: { status: 200, body: '<embeddable>0</embeddable>' } });
    expect(await isPlayable('niconico', 'sm1')).toBe(false);
  });

  it('センシティブ扱いの動画（埋め込みのページだけが 403）は流せない', async () => {
    stubFetch({ [THUMB]: { status: 200, body: OK_XML }, [EMBED]: { status: 403 } });
    expect(await isPlayable('niconico', 'sm4217141')).toBe(false);
  });

  it('窓口が失敗したときは、分からない（外さない）', async () => {
    stubFetch({ [THUMB]: { status: 503 } });
    expect(await isPlayable('niconico', 'sm1')).toBeNull();
    stubFetch({ [THUMB]: { status: 200, body: OK_XML }, [EMBED]: { status: 500 } });
    expect(await isPlayable('niconico', 'sm1')).toBeNull();
  });
});
