import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { relatedSongs } from '@/lib/catalog';
import { seed } from './seed';

/** VocaDB の関連曲の返事を差し替える */
function stubVocaDb(response: Response | Error) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => {
      if (response instanceof Error) throw response;
      return response;
    }),
  );
}

beforeAll(() =>
  seed({
    songs: [
      { id: 1, publishedOn: '2020-01-01' },
      { id: 2, publishedOn: '2020-01-01' },
      { id: 4, publishedOn: '2020-01-01', youtubeId: null, niconicoId: 'sm4' },
      { id: 5, publishedOn: '2020-01-01' },
    ],
  }),
);

afterEach(() => vi.unstubAllGlobals());

describe('relatedSongs（ラジオの関連曲）', () => {
  it('3つの並びから1曲ずつ順に混ぜ、重なりを外し、このサイトで流せる曲だけを返す', async () => {
    stubVocaDb(
      Response.json({
        likeMatches: [{ id: 1 }, { id: 2 }, { id: 5 }],
        tagMatches: [{ id: 3 }, { id: 1 }],
        artistMatches: [{ id: 4 }],
      }),
    );
    // 混ぜた順は 1・3・4・2・5。3 は台帳に無く、4 は流せない（ニコニコの表紙が無い）
    expect((await relatedSongs(100)).map((s) => s.songId)).toEqual([1, 2, 5]);
  });

  it('並びが欠けていても読む', async () => {
    stubVocaDb(Response.json({ artistMatches: [{ id: 2 }] }));
    expect((await relatedSongs(100)).map((s) => s.songId)).toEqual([2]);
  });

  it('VocaDB が失敗したか、つながらないときは空', async () => {
    stubVocaDb(new Response(null, { status: 503 }));
    expect(await relatedSongs(100)).toEqual([]);
    stubVocaDb(new Error('offline'));
    expect(await relatedSongs(100)).toEqual([]);
  });
});
