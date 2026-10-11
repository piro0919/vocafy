// @vitest-environment happy-dom
import { act, cleanup, render, renderHook, waitFor } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { QueueItem } from '@/lib/catalog';

// vitest の globals を使っていないので、描いた部品はテストごとに自分で片付ける（残すと受け口が重なる）
afterEach(cleanup);

/**
 * ログインしているあいだのお気に入りの同期（account-sync.tsx）と、アプリから開いたときに前回の画面へ移る処理（page-restore.tsx）。
 * セッション・fetch・ルーターを差し替える。お気に入りの手元への書き込みは本物（favorites.ts）を使う
 */

const auth = vi.hoisted(() => ({
  hint: true,
  session: { data: { user: { id: 'u1' } } } as { data: { user: { id: string } } | null },
  hintSet: [] as boolean[],
}));
vi.mock('@/lib/auth-client', () => ({
  authClient: { getSession: async () => auth.session },
  hasSignInHint: () => auth.hint,
  setSignInHint: (on: boolean) => auth.hintSet.push(on),
}));
const nav = vi.hoisted(() => ({ replace: vi.fn(), pathname: '/', search: '' }));
vi.mock('@/i18n/navigation', () => ({
  useRouter: () => ({ replace: nav.replace }),
  usePathname: () => nav.pathname,
}));
vi.mock('next/navigation', () => ({ useSearchParams: () => new URLSearchParams(nav.search) }));
const standalone = vi.hoisted(() => ({ value: true }));
vi.mock('@/lib/standalone', () => ({ isStandaloneApp: () => standalone.value }));

const fetchMock = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>();
vi.stubGlobal('fetch', fetchMock);

const { AccountSync } = await import('@/components/account/account-sync');
const { PageRestore } = await import('@/components/page-restore');
const { replaceFavorites, setSignedIn, useFavorites } = await import('@/lib/favorites');
const { saveLastPage } = await import('@/components/player/player-resume');

const song = (songId: number): QueueItem => ({
  songId,
  title: `曲${songId}`,
  service: 'youtube',
  videoId: `yt${songId}`,
  thumb: '',
  producerId: 1,
  producerName: 'P',
  vocalists: '',
});
const songIds = () =>
  (JSON.parse(localStorage.getItem('vocafy-favorites') ?? '[]') as QueueItem[]).map(
    (s) => s.songId,
  );
const account = (ids: number[]) => Response.json({ songs: ids.map(song), producers: [] });

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  fetchMock.mockReset();
  auth.hint = true;
  auth.session = { data: { user: { id: 'u1' } } };
  auth.hintSet = [];
  setSignedIn(false);
  nav.replace.mockReset();
  nav.pathname = '/';
  nav.search = '';
  standalone.value = true;
  window.history.replaceState(null, '', '/');
});

describe('AccountSync（お気に入りをアカウントと合わせる）', () => {
  it('ログインしたことのない端末は、セッションを聞きに行かない', async () => {
    auth.hint = false;
    render(createElement(AccountSync));
    await new Promise((r) => setTimeout(r, 10));
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('その端末で初めてログインしたときは、手元のお気に入りをアカウントに足してから、アカウントの中身を写す', async () => {
    replaceFavorites({ songs: [song(1)], producers: [] });
    fetchMock.mockResolvedValue(account([1, 2]));
    render(createElement(AccountSync));
    await waitFor(() => expect(songIds()).toEqual([1, 2]));
    const [url, init] = fetchMock.mock.calls[0];
    expect([url, init?.method, JSON.parse(String(init?.body))]).toEqual([
      '/api/favorites',
      'PUT',
      { songs: [1], producers: [] },
    ]);
    expect(localStorage.getItem('vocafy-favorites-merged-u1')).not.toBeNull();
  });

  it('2回目からは、足さずにアカウントの中身を読んで写す', async () => {
    localStorage.setItem('vocafy-favorites-merged-u1', 'x');
    replaceFavorites({ songs: [song(9)], producers: [] });
    fetchMock.mockResolvedValue(account([3]));
    render(createElement(AccountSync));
    await waitFor(() => expect(songIds()).toEqual([3]));
    expect(fetchMock.mock.calls[0][1]?.method).toBeUndefined();
  });

  it('取りに行っているあいだにハートを押していたら、届いた中身で手元を置き換えない', async () => {
    localStorage.setItem('vocafy-favorites-merged-u1', 'x');
    let answer: (r: Response) => void = () => {};
    fetchMock.mockImplementationOnce(() => new Promise((resolve) => (answer = resolve)));
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));
    render(createElement(AccountSync));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    // 押す（favorites.ts の toggle と同じく、押した回数が増える）
    const { result } = renderHook(() => useFavorites());
    act(() => result.current.toggle(song(5)));
    answer(account([1]));
    await new Promise((r) => setTimeout(r, 10));
    expect(songIds()).toEqual([5]);
  });

  it('セッションが切れていたら、次からは聞きに行かないよう印を外す', async () => {
    auth.session = { data: null };
    render(createElement(AccountSync));
    await waitFor(() => expect(auth.hintSet).toEqual([false]));
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('アカウントの中身を取れなかったら、手元はそのまま', async () => {
    localStorage.setItem('vocafy-favorites-merged-u1', 'x');
    replaceFavorites({ songs: [song(7)], producers: [] });
    fetchMock.mockResolvedValue(new Response(null, { status: 500 }));
    render(createElement(AccountSync));
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    await new Promise((r) => setTimeout(r, 10));
    expect(songIds()).toEqual([7]);
  });
});

describe('PageRestore（アプリから開いたときに前回の画面へ）', () => {
  it('アプリを開いた最初の1回だけ、トップから前回の画面へ置き換えで移る', () => {
    saveLastPage('/producers/45');
    const first = render(createElement(PageRestore));
    expect(nav.replace).toHaveBeenCalledWith('/producers/45');
    first.unmount();
    nav.replace.mockReset();
    render(createElement(PageRestore));
    expect(nav.replace).not.toHaveBeenCalled();
  });

  it('ブラウザで開いたときと、トップ以外を開いたときは移さない', () => {
    saveLastPage('/producers/45');
    standalone.value = false;
    render(createElement(PageRestore));
    expect(nav.replace).not.toHaveBeenCalled();
    sessionStorage.clear();
    standalone.value = true;
    window.history.replaceState(null, '', '/years');
    render(createElement(PageRestore));
    expect(nav.replace).not.toHaveBeenCalled();
  });

  it('見ている画面を、問い合わせ（?q= など）ごと残す', () => {
    nav.pathname = '/search';
    nav.search = 'q=miku';
    render(createElement(PageRestore));
    expect(JSON.parse(localStorage.getItem('vocafy-last-page') ?? '{}').path).toBe(
      '/search?q=miku',
    );
  });
});
