// @vitest-environment happy-dom
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { QueueItem } from '@/lib/catalog';

// vitest の globals を使っていないので、描いた部品はテストごとに自分で片付ける（残すと受け口が重なる）
afterEach(cleanup);

/**
 * お気に入り（favorites.ts）。手元（localStorage）への書き方、ログインしているときだけアカウントへ送ること、
 * 1日1回の引き直しを確かめる。fetch とログインの印は差し替える
 */

const hint = vi.hoisted(() => ({ value: false }));
vi.mock('@/lib/auth-client', () => ({ hasSignInHint: () => hint.value }));
const fetchMock = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>();
vi.stubGlobal('fetch', fetchMock);

const {
  clearLocalFavorites,
  favoriteEdits,
  localFavoriteIds,
  moveFavoriteSong,
  replaceFavorites,
  setSignedIn,
  useFavoriteProducers,
  useFavorites,
  useRefreshFavorites,
} = await import('@/lib/favorites');

const song = (songId: number, title = `曲${songId}`): QueueItem => ({
  songId,
  title,
  service: 'youtube',
  videoId: `yt${songId}`,
  thumb: '',
  producerId: 1,
  producerName: 'P',
  vocalists: '',
});
const stored = (key: string) =>
  JSON.parse(localStorage.getItem(key) ?? '[]') as { songId?: number; id?: number }[];
const songIds = () => stored('vocafy-favorites').map((s) => s.songId);
const bodies = () =>
  fetchMock.mock.calls.map(([url, init]) => [url, init?.method, JSON.parse(String(init?.body))]);

beforeEach(() => {
  localStorage.clear();
  fetchMock.mockReset();
  fetchMock.mockResolvedValue(new Response(null, { status: 204 }));
  setSignedIn(false);
  hint.value = false;
});

describe('ハートを押す（toggle）', () => {
  it('入れた曲は先頭に入り、もう一度押すと外れる。押した回数を数える', () => {
    const { result } = renderHook(() => useFavorites());
    const before = favoriteEdits();
    act(() => result.current.toggle(song(1)));
    act(() => result.current.toggle(song(2)));
    expect(songIds()).toEqual([2, 1]);
    expect(result.current.has(1)).toBe(true);
    act(() => result.current.toggle(song(1)));
    expect(songIds()).toEqual([2]);
    expect(result.current.has(1)).toBe(false);
    expect(favoriteEdits() - before).toBe(3);
  });

  it('ログインしていないときは、アカウントに送らない', () => {
    const { result } = renderHook(() => useFavorites());
    act(() => result.current.toggle(song(1)));
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('ログインしているときは、足したか外したかをアカウントにも送る', () => {
    setSignedIn(true);
    const { result } = renderHook(() => useFavoriteProducers());
    act(() => result.current.toggle({ id: 45, name: 'DECO＊27', picture: null }));
    act(() => result.current.toggle({ id: 45, name: 'DECO＊27', picture: null }));
    expect(bodies()).toEqual([
      ['/api/favorites', 'POST', { kind: 'producer', id: 45, on: true }],
      ['/api/favorites', 'POST', { kind: 'producer', id: 45, on: false }],
    ]);
  });

  it('送れなくても、手元は変わったまま', async () => {
    setSignedIn(true);
    fetchMock.mockRejectedValue(new Error('offline'));
    const { result } = renderHook(() => useFavorites());
    act(() => result.current.toggle(song(1)));
    await act(async () => {});
    expect(songIds()).toEqual([1]);
  });
});

describe('並べ替えと入れ替え', () => {
  it('曲を動かし、ログインしていれば並びをアカウントにも送る', () => {
    replaceFavorites({ songs: [song(1), song(2), song(3)], producers: [] });
    setSignedIn(true);
    moveFavoriteSong(3, 1);
    expect(songIds()).toEqual([3, 1, 2]);
    expect(bodies()).toEqual([['/api/favorites', 'PATCH', { songs: [3, 1, 2] }]]);
  });

  it('動かせない（同じ位置・無い曲）ときは何もしない', () => {
    replaceFavorites({ songs: [song(1), song(2)], producers: [] });
    setSignedIn(true);
    moveFavoriteSong(1, 1);
    moveFavoriteSong(9, 1);
    expect(songIds()).toEqual([1, 2]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('手元の id を返し、ログアウトで手元の写しを消す', () => {
    replaceFavorites({ songs: [song(1)], producers: [{ id: 45, name: 'P', picture: null }] });
    expect(localFavoriteIds()).toEqual({ songs: [1], producers: [45] });
    clearLocalFavorites();
    expect(localFavoriteIds()).toEqual({ songs: [], producers: [] });
  });
});

describe('1日1回の引き直し（useRefreshFavorites）', () => {
  const freshResponse = (songs: QueueItem[], producers: unknown[] = []) =>
    Promise.resolve(Response.json({ songs, producers }));

  it('前に引き直してから1日たっていれば、いまの情報で置き換え、流せなくなった曲は外す', async () => {
    replaceFavorites({ songs: [song(1, '古い題'), song(2)], producers: [] });
    fetchMock.mockImplementation(() => freshResponse([song(1, '新しい題')]));
    renderHook(() => useRefreshFavorites());
    await waitFor(() => expect(localStorage.getItem('vocafy-favorites-refreshed')).not.toBeNull());
    expect(stored('vocafy-favorites')).toEqual([
      expect.objectContaining({ songId: 1, title: '新しい題' }),
    ]);
    expect(bodies()).toEqual([['/api/favorites/fresh', 'POST', { songs: [1, 2], producers: [] }]]);
  });

  it('1日たっていなければ引き直さない', () => {
    replaceFavorites({ songs: [song(1)], producers: [] });
    localStorage.setItem('vocafy-favorites-refreshed', String(Date.now()));
    renderHook(() => useRefreshFavorites());
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('ログインしたことのある端末と、お気に入りが空のときは引き直さない', () => {
    replaceFavorites({ songs: [song(1)], producers: [] });
    hint.value = true;
    renderHook(() => useRefreshFavorites());
    hint.value = false;
    clearLocalFavorites();
    renderHook(() => useRefreshFavorites());
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('待っているあいだに足した曲は残す', async () => {
    replaceFavorites({ songs: [song(1)], producers: [] });
    let answer: (value: Response) => void = () => {};
    fetchMock.mockImplementation(() => new Promise((resolve) => (answer = resolve)));
    renderHook(() => useRefreshFavorites());
    const { result } = renderHook(() => useFavorites());
    act(() => result.current.toggle(song(5)));
    await act(async () => answer(Response.json({ songs: [song(1)], producers: [] })));
    await waitFor(() => expect(localStorage.getItem('vocafy-favorites-refreshed')).not.toBeNull());
    expect(songIds()).toEqual([5, 1]);
  });
});
