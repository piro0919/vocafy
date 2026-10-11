import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SearchIndex } from '@/lib/catalog';

/** 検索の索引の1段目をブラウザで読む形にする（search-index.ts の loadIndex）。fetch を差し替えて確かめる */

const fetchMock = vi.fn<(url: string) => Promise<Response>>();
vi.stubGlobal('fetch', fetchMock);

const INDEX = {
  producers: [
    [45, 'ＤＥＣＯ＊２７', 'deco.jpg', 3],
    [7, 'ハチ', null, 1],
  ],
  songs: [
    ['ゴーストルール', 0, 'Ghost Rule'],
    ['マトリョシカ', 1, null],
    ['ヴァンパイア', 0, null],
    ['妄想感傷代償連盟', 0, ''],
  ],
  voices: [[1, '初音ミク', 12925]],
} as unknown as SearchIndex;

const ok = () => Promise.resolve(Response.json(INDEX));

// 読み込みの状態はモジュールの変数なので、テストごとに読み込み直す
async function loadIndex() {
  vi.resetModules();
  return (await import('@/lib/search-index')).loadIndex;
}

beforeEach(() => fetchMock.mockReset());

describe('loadIndex', () => {
  it('曲ごとに、そのボカロPの曲の中で何番目かを数える（2段目のファイルを引く番号）', async () => {
    fetchMock.mockImplementation(ok);
    const index = await (await loadIndex())();
    expect(index.songs.map((s) => [s.name, s.producer.id, s.nth])).toEqual([
      ['ゴーストルール', 45, 0],
      ['マトリョシカ', 7, 0],
      ['ヴァンパイア', 45, 1],
      ['妄想感傷代償連盟', 45, 2],
    ]);
  });

  it('探すための形（正規化した名前とローマ字）を足す。ローマ字の無い曲は空', async () => {
    fetchMock.mockImplementation(ok);
    const index = await (await loadIndex())();
    expect(index.producers[0]).toMatchObject({ id: 45, picture: 'deco.jpg', songCount: 3 });
    expect(index.producers[0].key).not.toBe('ＤＥＣＯ＊２７');
    expect(index.songs[0].romaji).not.toBe('');
    expect(index.songs[1].romaji).toBe('');
    expect(index.songs[3].romaji).toBe('');
    expect(index.voices[0]).toMatchObject({ id: 1, name: '初音ミク', songCount: 12925 });
  });

  it('何度呼んでも1回しか取りに行かない', async () => {
    fetchMock.mockImplementation(ok);
    const load = await loadIndex();
    const [a, b] = await Promise.all([load(), load()]);
    await load();
    expect(a).toBe(b);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith('/search-index');
  });

  it('読めなかったら失敗を返し、次に呼んだときに取り直す', async () => {
    fetchMock.mockRejectedValueOnce(new Error('offline')).mockImplementation(ok);
    const load = await loadIndex();
    await expect(load()).rejects.toThrow('offline');
    const index = await load();
    expect(index.songs).toHaveLength(4);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
