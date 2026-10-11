import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { POST as fresh } from '@/app/api/favorites/fresh/route';
import { GET as latest } from '@/app/api/latest/[producer]/route';
import { GET as producerCard } from '@/app/api/producer/[id]/route';
import { GET as producerQueue } from '@/app/api/producer-queue/[producer]/route';
import { GET as related } from '@/app/api/related/[id]/route';
import { GET as searchDetailsRoute } from '@/app/search-index/[producer]/route';
import type { QueueItem } from '@/lib/catalog';
import { MAX_FAVORITES } from '@/lib/favorites-limit';
import { seed } from './seed';

/**
 * 開かれたときに作り置く API（ボカロPの新曲・曲の並び・名前と画像）と、お気に入りの引き直し。
 * どれも DB を読む。形の違う番号と、台帳に無い番号の扱いも見る
 */

beforeAll(() =>
  seed({
    producers: [
      { id: 1, name: 'DECO*27' },
      { id: 2, name: 'ハチ' },
      // 合作の相手（全曲を取っていない人）。一覧にも並びにも出さない
      { id: 3, name: '合作の人', complete: false },
    ],
    vocalists: [{ id: 10, name: '初音ミク' }],
    songs: [
      { id: 101, publishedOn: '2020-01-01', producers: [1], vocalists: [10] },
      { id: 102, publishedOn: '2021-01-01', producers: [1] },
      { id: 103, publishedOn: '2019-01-01', producers: [1, 3] },
      { id: 104, publishedOn: '2022-01-01', producers: [1] },
      { id: 105, publishedOn: null, producers: [1] },
      {
        id: 201,
        publishedOn: '2010-01-01',
        producers: [2],
        youtubeId: null,
        niconicoId: 'sm1',
        niconicoThumb: 'https://nicovideo.cdn.nimg.jp/thumbnails/1/1',
      },
    ],
  }),
);

const ctx = <T>(params: T) => ({ params: Promise.resolve(params) });
const ids = (items: QueueItem[]) => items.map((s) => s.songId);

describe('/api/latest/[producer]（ボカロPの新曲）', () => {
  async function get(producer: string) {
    const res = await latest(new Request('http://localhost'), ctx({ producer }) as never);
    return { status: res.status, songs: (await res.json()) as QueueItem[] };
  }

  it('曲を新しい順に、決まった数だけ返す（日付の無い曲は後ろ）', async () => {
    const { status, songs } = await get('1');
    expect(status).toBe(200);
    expect(ids(songs)).toEqual([104, 102, 101]);
  });

  it('ニコニコだけの曲も返す', async () => {
    const { songs } = await get('2');
    expect(songs).toEqual([
      expect.objectContaining({ songId: 201, service: 'niconico', videoId: 'sm1' }),
    ]);
  });

  it('番号でなければ 404、台帳に無い人は空', async () => {
    expect((await get('abc')).status).toBe(404);
    expect(await get('999')).toEqual({ status: 200, songs: [] });
  });
});

describe('/api/producer-queue/[producer]（ラジオをやめたときの並び）', () => {
  async function get(producer: string) {
    const res = await producerQueue(new Request('http://localhost'), ctx({ producer }) as never);
    return { status: res.status, songs: (await res.json()) as QueueItem[] };
  }

  it('その人の曲をすべて、新しい順に、その人の曲として返す', async () => {
    const { songs } = await get('1');
    expect(ids(songs)).toEqual([104, 102, 101, 103, 105]);
    expect(songs.every((s) => s.producerId === 1 && s.producerName === 'DECO*27')).toBe(true);
    expect(songs.find((s) => s.songId === 101)?.vocalists).toBe('初音ミク');
  });

  it('全曲を取っていない人・台帳に無い人・番号でないものは 404', async () => {
    for (const producer of ['3', '999', 'abc']) expect((await get(producer)).status).toBe(404);
  });
});

describe('/api/producer/[id]（動画の下に出すボカロP）', () => {
  async function get(id: string) {
    const res = await producerCard(new Request('http://localhost'), ctx({ id }) as never);
    return { status: res.status, body: (await res.json()) as { name: string } | null };
  }

  it('名前を返す。全曲を取っていない人も返す（並びの曲の作者として出るため）', async () => {
    expect((await get('1')).body?.name).toBe('DECO*27');
    expect((await get('3')).body?.name).toBe('合作の人');
  });

  it('台帳に無い人・番号でないものは 404', async () => {
    expect(await get('999')).toEqual({ status: 404, body: null });
    expect((await get('1.5')).status).toBe(404);
  });
});

describe('/api/favorites/fresh（お気に入りの引き直し）', () => {
  async function post(body: unknown) {
    const res = await fresh(
      new Request('http://localhost', {
        method: 'POST',
        body: typeof body === 'string' ? body : JSON.stringify(body),
      }),
    );
    return { status: res.status, body: res.status === 200 ? await res.json() : null };
  }

  it('いまの曲とボカロPを、渡した順に返す。台帳から消えた曲と人は落とす', async () => {
    const { status, body } = await post({ songs: [102, 999, 101], producers: [2, 999, 1] });
    expect(status).toBe(200);
    expect(ids(body.songs)).toEqual([102, 101]);
    expect(body.producers.map((p: { id: number }) => p.id)).toEqual([2, 1]);
  });

  it('空の並びは空で返す', async () => {
    expect(await post({ songs: [], producers: [] })).toEqual({
      status: 200,
      body: { songs: [], producers: [] },
    });
  });

  it('形の違う中身・上限を超える数は 400', async () => {
    for (const body of [
      '{',
      {},
      { songs: [1.5], producers: [] },
      { songs: [-1], producers: [] },
      { songs: ['1'], producers: [] },
      { songs: Array.from({ length: MAX_FAVORITES + 1 }, (_, i) => i + 1), producers: [] },
    ]) {
      expect((await post(body)).status).toBe(400);
    }
  });
});

describe('/api/related/[id]（ラジオの関連曲）', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('関連曲のうち流せる曲を返し、CDN に1日置く', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        Response.json({
          likeMatches: [{ id: 102 }, { id: 999 }],
          tagMatches: [],
          artistMatches: [],
        }),
      ),
    );
    const res = await related(new Request('http://localhost'), ctx({ id: '101' }) as never);
    expect(ids((await res.json()) as QueueItem[])).toEqual([102]);
    expect(res.headers.get('Cache-Control')).toBe(
      'public, s-maxage=86400, stale-while-revalidate=604800',
    );
  });

  it('番号でなければ VocaDB に聞かずに空', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const res = await related(new Request('http://localhost'), ctx({ id: 'abc' }) as never);
    expect(await res.json()).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('/search-index/[producer]（検索の索引の2段目）', () => {
  async function get(producer: string) {
    const res = await searchDetailsRoute(
      new Request('http://localhost'),
      ctx({ producer }) as never,
    );
    return { status: res.status, rows: (await res.json()) as unknown[] };
  }

  it('そのボカロPの曲を返し、番号でなければ 404', async () => {
    expect((await get('1')).rows).toHaveLength(5);
    expect((await get('abc')).status).toBe(404);
  });
});
