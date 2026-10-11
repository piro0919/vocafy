import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * VocaDB への問い合わせ（scripts/lib/vocadb.ts）。控えのファイルと fetch を差し替え、偽の時計で、
 * 控えの使い方と、混み合い・止まっている・つながらないときの聞き直しを確かめる。手元の data/raw には触らない
 */

const files = vi.hoisted(() => new Map<string, { text: string; mtimeMs: number }>());
vi.mock('node:fs/promises', () => ({
  readFile: async (url: URL) => {
    const f = files.get(String(url));
    if (!f) throw new Error('ENOENT');
    return f.text;
  },
  stat: async (url: URL) => {
    const f = files.get(String(url));
    if (!f) throw new Error('ENOENT');
    return { mtimeMs: f.mtimeMs };
  },
  writeFile: async (url: URL, text: string) =>
    void files.set(String(url), { text, mtimeMs: Date.now() }),
  mkdir: async () => {},
}));

const fetchMock = vi.fn<(url: string) => Promise<Response>>();
vi.stubGlobal('fetch', fetchMock);
vi.spyOn(console, 'log').mockImplementation(() => {});

const MINUTE = 60_000;
const DAY = 24 * 60 * MINUTE;
const name = (n: string) => Response.json({ name: n });
const status = (code: number) => new Response(null, { status: code });

// 前の問い合わせからの間隔（1秒に1回）はモジュールの変数なので、テストごとに読み込み直す
// 時計を進める前に読み込みを終えておく（読み込みの途中で時計を進めると、問い合わせが始まる前に進んでしまう）
let englishName: (id?: number) => Promise<string>;
beforeEach(async () => {
  vi.resetModules();
  const { voicebankEnglishName } = await import('../scripts/lib/vocadb');
  englishName = (id = 1) => voicebankEnglishName(id);
});

beforeEach(() => {
  vi.useFakeTimers();
  files.clear();
  fetchMock.mockReset();
});
afterEach(() => vi.useRealTimers());

describe('聞き直し', () => {
  it('503・429 なら1分待って聞き直す', async () => {
    fetchMock
      .mockResolvedValueOnce(status(503))
      .mockResolvedValueOnce(status(429))
      .mockResolvedValueOnce(name('Hatsune Miku'));
    const pending = englishName();
    // 1分と2分の待ちに、1秒に1回の間隔が加わる
    await vi.advanceTimersByTimeAsync(4 * MINUTE);
    await expect(pending).resolves.toBe('Hatsune Miku');
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('つながらなかったときも、待って聞き直す', async () => {
    fetchMock.mockRejectedValueOnce(new Error('ENOTFOUND')).mockResolvedValueOnce(name('GUMI'));
    const pending = englishName();
    await vi.advanceTimersByTimeAsync(MINUTE);
    await expect(pending).resolves.toBe('GUMI');
  });

  it('1・2・4・8分待っても駄目なら落とす', async () => {
    fetchMock.mockResolvedValue(status(503));
    const pending = englishName();
    const caught = expect(pending).rejects.toThrow('VocaDB 503');
    await vi.advanceTimersByTimeAsync((1 + 2 + 4 + 8) * MINUTE + MINUTE);
    await caught;
    expect(fetchMock).toHaveBeenCalledTimes(5);
  });

  it('404 などは聞き直さずにすぐ落とす', async () => {
    fetchMock.mockResolvedValue(status(404));
    await expect(englishName()).rejects.toThrow('VocaDB 404');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe('控え', () => {
  it('取った返事は控えに残し、30日のあいだは聞かずに控えを読む', async () => {
    fetchMock.mockResolvedValue(name('Kasane Teto'));
    await expect(englishName(3)).resolves.toBe('Kasane Teto');
    expect(files.size).toBe(1);
    await expect(englishName(3)).resolves.toBe('Kasane Teto');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('30日を過ぎた控えは聞き直す', async () => {
    fetchMock.mockResolvedValue(name('Kasane Teto'));
    await englishName(3);
    for (const f of files.values()) f.mtimeMs = Date.now() - 31 * DAY;
    fetchMock.mockResolvedValue(name('Kasane Teto (new)'));
    const pending = englishName(3);
    // 前の問い合わせから1秒あける
    await vi.advanceTimersByTimeAsync(MINUTE);
    await expect(pending).resolves.toBe('Kasane Teto (new)');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
