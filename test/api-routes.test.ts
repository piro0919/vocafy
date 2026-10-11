import { beforeEach, describe, expect, it, vi } from 'vitest';

// 受け口だけを確かめる。DB と外の窓口とログインは差し替える（DB の中身は test/db/ で確かめる）
const mocks = vi.hoisted(() => ({
  userIdOf: vi.fn<(request: Request) => Promise<string | null>>(),
  setFavorite: vi.fn(),
  mergeFavorites: vi.fn(),
  readFavorites: vi.fn(async () => ({ songs: [], producers: [] })),
  reorderFavoriteSongs: vi.fn(),
  isPlayable: vi.fn<() => Promise<boolean | null>>(),
  markUnplayable: vi.fn(async () => [45]),
  revalidatePath: vi.fn(),
}));
vi.mock('@/lib/auth', () => ({ userIdOf: mocks.userIdOf }));
vi.mock('@/lib/account-favorites', () => ({
  setFavorite: mocks.setFavorite,
  mergeFavorites: mocks.mergeFavorites,
  readFavorites: mocks.readFavorites,
  reorderFavoriteSongs: mocks.reorderFavoriteSongs,
}));
vi.mock('@/lib/unplayable', () => ({
  isPlayable: mocks.isPlayable,
  markUnplayable: mocks.markUnplayable,
}));
vi.mock('next/cache', () => ({ revalidatePath: mocks.revalidatePath }));

const favorites = await import('@/app/api/favorites/route');
const unplayable = await import('@/app/api/unplayable/route');

const request = (method: string, body?: unknown) =>
  new Request('http://localhost/api', {
    method,
    body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body),
  });

beforeEach(() => {
  vi.clearAllMocks();
  mocks.userIdOf.mockResolvedValue('u1');
});

describe('/api/favorites', () => {
  it('ログインしていなければ 401 で、何も書かない', async () => {
    mocks.userIdOf.mockResolvedValue(null);
    for (const res of [
      await favorites.GET(request('GET')),
      await favorites.POST(request('POST', { kind: 'song', id: 1, on: true })),
      await favorites.PUT(request('PUT', { songs: [], producers: [] })),
      await favorites.PATCH(request('PATCH', { songs: [] })),
    ]) {
      expect(res.status).toBe(401);
    }
    expect(mocks.setFavorite).not.toHaveBeenCalled();
    expect(mocks.mergeFavorites).not.toHaveBeenCalled();
    expect(mocks.reorderFavoriteSongs).not.toHaveBeenCalled();
  });

  it('1件を足すか外す', async () => {
    const res = await favorites.POST(request('POST', { kind: 'producer', id: 45, on: false }));
    expect(res.status).toBe(204);
    expect(mocks.setFavorite).toHaveBeenCalledWith('u1', 'producer', 45, false);
  });

  it('形の違う本文と、JSON として読めない本文は 400', async () => {
    for (const body of [
      { kind: 'album', id: 1, on: true },
      { kind: 'song', id: -1, on: true },
      { kind: 'song', id: 1.5, on: true },
      { kind: 'song', id: 1 },
      '{not json',
    ]) {
      expect((await favorites.POST(request('POST', body))).status).toBe(400);
    }
    expect((await favorites.PUT(request('PUT', '{'))).status).toBe(400);
    expect((await favorites.PATCH(request('PATCH', { songs: ['1'] }))).status).toBe(400);
    expect(mocks.setFavorite).not.toHaveBeenCalled();
  });

  it('ブラウザに残っていたものを足し、足したあとのお気に入りを返す', async () => {
    const res = await favorites.PUT(request('PUT', { songs: [3, 1], producers: [45] }));
    expect(res.status).toBe(200);
    expect(mocks.mergeFavorites).toHaveBeenCalledWith('u1', 'song', [3, 1]);
    expect(mocks.mergeFavorites).toHaveBeenCalledWith('u1', 'producer', [45]);
    expect(await res.json()).toEqual({ songs: [], producers: [] });
  });

  it('ユーザーごとに違うので、作り置きさせない', async () => {
    const res = await favorites.GET(request('GET'));
    expect(res.headers.get('Cache-Control')).toBe('private, no-store');
  });
});

describe('/api/unplayable', () => {
  // 同じ動画の知らせは10分覚えているので、テストごとに別の動画にする
  let n = 0;
  const videoId = () => `abcdefghij${n++}`.slice(-11);

  it('形の違う知らせは 400 で、確かめに行かない', async () => {
    for (const body of [
      { service: 'youtube', videoId: 'x' },
      { service: 'vimeo', videoId: 'abcdefghijk' },
      { service: 'niconico', videoId: 'abc' },
      '{',
    ]) {
      expect((await unplayable.POST(request('POST', body))).status).toBe(400);
    }
    expect(mocks.isPlayable).not.toHaveBeenCalled();
  });

  it('確かめ直して流せないときだけ外し、その曲のボカロPの画面を作り直す', async () => {
    mocks.isPlayable.mockResolvedValue(false);
    const id = videoId();
    const res = await unplayable.POST(request('POST', { service: 'youtube', videoId: id }));
    expect(await res.json()).toEqual({ checked: true, removed: true });
    expect(mocks.markUnplayable).toHaveBeenCalledWith('youtube', id);
    expect(mocks.revalidatePath).toHaveBeenCalledWith('/producers/45');
  });

  it('流せるか分からないとき（窓口の混み合いなど）と流せるときは外さない', async () => {
    for (const result of [null, true]) {
      mocks.isPlayable.mockResolvedValue(result);
      await unplayable.POST(request('POST', { service: 'youtube', videoId: videoId() }));
    }
    expect(mocks.markUnplayable).not.toHaveBeenCalled();
  });

  it('同じ動画の知らせが続いても、確かめに行くのは1回', async () => {
    mocks.isPlayable.mockResolvedValue(true);
    const body = { service: 'niconico', videoId: 'sm8166339' };
    await unplayable.POST(request('POST', body));
    const again = await unplayable.POST(request('POST', body));
    expect(await again.json()).toEqual({ checked: false });
    expect(mocks.isPlayable).toHaveBeenCalledTimes(1);
  });
});
