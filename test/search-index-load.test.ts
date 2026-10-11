import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SearchDetails, SearchIndex } from '@/lib/catalog';
import { normalize } from '@/lib/search';
import { detailsToItems, findInIndex } from '@/lib/search-index';

/** 検索の索引の1段目をブラウザで読む形にする（search-index.ts の loadIndex）。fetch を差し替えて確かめる */

const fetchMock = vi.fn<(url: string) => Promise<Response>>();
vi.stubGlobal('fetch', fetchMock);

const INDEX = {
  producers: [
    [45, 'ＤＥＣＯ＊２７', 'deco.jpg', 3],
    [7, 'ハチ', null, 1, 'Hachi'],
  ],
  songs: [
    ['ゴーストルール', 0, 'Ghost Rule'],
    ['マトリョシカ', 1, null],
    ['ヴァンパイア', 0, null],
    ['妄想感傷代償連盟', 0, ''],
    ['ブロッサム', 1, null, 'Sakura Blossom'],
    ['桜ノ雨', 1, 'Sakura no Ame', null],
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
      ['ブロッサム', 7, 1],
      ['桜ノ雨', 7, 2],
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
    expect(index.songs).toHaveLength(6);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

describe('findInIndex（索引から探す）', () => {
  async function index() {
    fetchMock.mockImplementation(ok);
    return (await loadIndex())();
  }
  const names = (list: { name: string }[]) => list.map((x) => x.name);

  it('ボカロPの名前で当たると、その人と、その人の曲が出る', async () => {
    const found = findInIndex(await index(), normalize('ハチ'));
    expect(names(found.producers)).toEqual(['ハチ']);
    expect(names(found.songs)).toEqual(['マトリョシカ', 'ブロッサム', '桜ノ雨']);
  });

  it('ボカロPの英語の名前でも当たる', async () => {
    expect(names(findInIndex(await index(), normalize('hachi')).producers)).toEqual(['ハチ']);
  });

  it('曲名とローマ字で当たった曲を、英語の名前（訳）で当たった曲より先にする', async () => {
    const found = findInIndex(await index(), normalize('sakura'));
    expect(names(found.songs)).toEqual(['桜ノ雨', 'ブロッサム']);
  });

  it('ローマ字は伸ばす音の書き方が違っても当たる', async () => {
    expect(names(findInIndex(await index(), normalize('sakura noo ame')).songs)).toEqual([
      '桜ノ雨',
    ]);
  });

  it('頭から当たる曲を、途中で当たる曲より先にする。ローマ字の曲名でも当たる', async () => {
    const i = await index();
    expect(names(findInIndex(i, normalize('ゴースト')).songs)).toEqual(['ゴーストルール']);
    expect(names(findInIndex(i, normalize('ghost')).songs)).toEqual(['ゴーストルール']);
  });

  it('全角で入った名前にも、半角の小文字で当たる', async () => {
    const i = await index();
    const found = findInIndex(i, normalize('deco'));
    expect(names(found.producers)).toEqual(['ＤＥＣＯ＊２７']);
    expect(found.songs).toHaveLength(3);
  });

  it('何にも当たらなければ空', async () => {
    const found = findInIndex(await index(), normalize('存在しない言葉'));
    expect(found).toEqual({ producers: [], songs: [], voices: [] });
  });
});

describe('detailsToItems（2段目と合わせて曲の並びにする）', () => {
  it('ボカロPごとの2段目の nth 番目の行を使い、YouTube とニコニコの表紙を組み立てる。行が無い曲は落とす', async () => {
    fetchMock.mockImplementation(ok);
    const index = await (await loadIndex())();
    const details = new Map<number, SearchDetails>([
      [
        45,
        [
          [1, 'ytA', null, '初音ミク'],
          [2, 'sm2', 'https://nicovideo.cdn.nimg.jp/thumbnails/2/2', 'GUMI'],
        ],
      ],
    ]);
    const items = detailsToItems(index.songs, details);
    expect(items).toEqual([
      expect.objectContaining({
        songId: 1,
        title: 'ゴーストルール',
        service: 'youtube',
        thumb: 'https://i.ytimg.com/vi/ytA/mqdefault.jpg',
        producerId: 45,
        vocalists: '初音ミク',
      }),
      expect.objectContaining({
        songId: 2,
        title: 'ヴァンパイア',
        service: 'niconico',
        videoId: 'sm2',
      }),
    ]);
  });
});
