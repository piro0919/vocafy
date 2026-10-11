import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * 取り込みが外に聞く確かめ（scripts/lib/youtube.ts・niconico.ts）。fetch と控えのファイルを差し替え、
 * 返事の番号の読み方・控えの使い方・数の区切り方を確かめる。手元の data/raw の控えには触らない
 */

const files = new Map<string, string>();
vi.mock('node:fs/promises', () => ({
  readFile: async (url: URL) => {
    const text = files.get(String(url));
    if (text === undefined) throw new Error('ENOENT');
    return text;
  },
  writeFile: async (url: URL, text: string) => void files.set(String(url), text),
  mkdir: async () => {},
  stat: async () => {
    throw new Error('ENOENT');
  },
}));

const fetchMock = vi.fn<(url: string) => Promise<Response>>();
vi.stubGlobal('fetch', fetchMock);
// 1秒に1回の待ちは、テストでは待たない
vi.stubGlobal('setTimeout', (fn: () => void) => {
  fn();
  return 0;
});
vi.spyOn(console, 'log').mockImplementation(() => {});

const { deadYouTube, viewCounts } = await import('../scripts/lib/youtube');
const { deadNiconico, legendVideos } = await import('../scripts/lib/niconico');

const cacheOf = (name: string) =>
  JSON.parse([...files].find(([url]) => url.endsWith(name))?.[1] ?? '{}') as Record<
    string,
    { ok?: boolean; views?: number; at: string }
  >;
const status = (code: number) => Promise.resolve(new Response(null, { status: code }));
/** URL に含まれる動画の番号ごとに返事の番号を決める */
const byId = (codes: Record<string, number>) => (url: string) => {
  const id = Object.keys(codes).find((k) => decodeURIComponent(url).includes(k));
  return status(id ? codes[id] : 200);
};

beforeEach(() => {
  files.clear();
  fetchMock.mockReset();
});

describe('deadYouTube（oEmbed で流せるか）', () => {
  it('401・403・404 は流せない、200 は流せる、ほかの番号と失敗は分からないとして控えに残さない', async () => {
    fetchMock.mockImplementation((url) =>
      url.includes('err')
        ? Promise.reject(new Error('net'))
        : byId({ a401: 401, b403: 403, c404: 404, d429: 429, e500: 500 })(url),
    );
    const dead = await deadYouTube(['a401', 'b403', 'c404', 'd429', 'e500', 'ok', 'err']);
    expect([...dead].sort()).toEqual(['a401', 'b403', 'c404']);
    expect(Object.keys(cacheOf('oembed.json')).sort()).toEqual(['a401', 'b403', 'c404', 'ok']);
  });

  it('30日以内に確かめた動画は聞き直さず、控えの結果を使う', async () => {
    const at = new Date().toISOString();
    files.set(
      String(new URL('../data/raw/youtube/oembed.json', import.meta.url)),
      JSON.stringify({ gone: { ok: false, at }, alive: { ok: true, at } }),
    );
    fetchMock.mockImplementation(() => status(200));
    const dead = await deadYouTube(['gone', 'alive', 'new']);
    expect([...dead]).toEqual(['gone']);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe('viewCounts（YouTube の再生数）', () => {
  it('50本ずつ聞き、返ってこなかった動画（消えた動画）は 0 にする', async () => {
    const ids = Array.from({ length: 60 }, (_, i) => `v${i}`);
    fetchMock.mockImplementation((url) => {
      const asked = new URL(url).searchParams.get('id')?.split(',') ?? [];
      const items = asked
        .filter((id) => id !== 'v3')
        .map((id) => ({ id, statistics: { viewCount: String(Number(id.slice(1)) * 10) } }));
      return Promise.resolve(Response.json({ items }));
    });
    const views = await viewCounts(ids, 'KEY');
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(new URL(fetchMock.mock.calls[0][0]).searchParams.get('id')?.split(',')).toHaveLength(50);
    expect(views.get('v5')).toBe(50);
    expect(views.get('v3')).toBe(0);
    expect(views.get('v59')).toBe(590);
    expect(cacheOf('views.json').v3.views).toBe(0);
  });

  it('API が失敗を返したら止める（再生数の線で種を選び損ねないように）', async () => {
    fetchMock.mockImplementation(() => Promise.resolve(new Response('quota', { status: 403 })));
    await expect(viewCounts(['v1'], 'KEY')).rejects.toThrow('YouTube Data API 403: quota');
  });
});

describe('deadNiconico（埋め込みのページで流せるか）', () => {
  it('403（センシティブ扱い）・404（消えた）は流せない。ほかの番号と失敗は控えに残さない', async () => {
    fetchMock.mockImplementation((url) =>
      url.endsWith('sm5')
        ? Promise.reject(new Error('net'))
        : byId({ sm1: 403, sm2: 404, sm3: 503 })(url),
    );
    const dead = await deadNiconico(['sm1', 'sm2', 'sm3', 'sm4', 'sm5']);
    expect([...dead].sort()).toEqual(['sm1', 'sm2']);
    expect(Object.keys(cacheOf('embed.json')).sort()).toEqual(['sm1', 'sm2', 'sm4']);
  });
});

describe('legendVideos（伝説入り）', () => {
  it('100本ずつずらして取り、100本に満たない返事で終える', async () => {
    const page = (n: number, from: number) =>
      Response.json({
        data: Array.from({ length: n }, (_, i) => ({ contentId: `sm${from + i}` })),
      });
    fetchMock.mockResolvedValueOnce(page(100, 0)).mockResolvedValueOnce(page(3, 100));
    const ids = await legendVideos('2025-10-12');
    expect(ids).toHaveLength(103);
    const second = new URL(fetchMock.mock.calls[1][0]).searchParams;
    expect(second.get('_offset')).toBe('100');
    expect(second.get('filters[startTime][gte]')).toBe('2025-10-12T00:00:00+09:00');
    // 日付で聞いたときは控えに書かない（全体の取り込みの控えを1年分で上書きしない）
    expect(files.size).toBe(0);
  });

  it('検索が失敗を返したら止める', async () => {
    fetchMock.mockImplementation(() => status(503));
    await expect(legendVideos('2025-10-12')).rejects.toThrow('ニコニコの検索 503');
  });
});
