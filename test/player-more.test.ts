// @vitest-environment happy-dom
import { cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { QueueItem } from '@/lib/catalog';
import {
  endNavigation,
  navigationPending,
  startNavigation,
  startNavigationTo,
} from '@/lib/navigation-state';

// vitest の globals を使っていないので、描いた部品はテストごとに自分で片付ける（残すと受け口が重なる）
afterEach(cleanup);

/**
 * 再生の周りの残り（曲の住所・ラジオの伸ばし方・前回の画面の控え・音の出口・きょうの出会いを流すか）。happy-dom の上で動かす
 */

const { useSongInUrl } = await import('@/components/player/use-song-in-url');
const { useRadioExtension } = await import('@/components/player/use-radio-extension');
const { readLastPage, saveLastPage, setResumeEnabled } =
  await import('@/components/player/player-resume');

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

beforeEach(() => {
  localStorage.clear();
  window.history.replaceState(null, '', '/producers/45');
  endNavigation();
});
afterEach(() => vi.unstubAllGlobals());

describe('useSongInUrl（流している曲を住所に入れる）', () => {
  it('その画面の並びを流しているあいだ、住所の ?song= を流している曲にする', () => {
    const { rerender } = renderHook(({ s }) => useSongInUrl(s, '/producers/45'), {
      initialProps: { s: song(1) as QueueItem | null },
    });
    expect(window.location.search).toBe('?song=1');
    rerender({ s: song(2) });
    expect(window.location.search).toBe('?song=2');
  });

  it('流していないとき・ほかの画面の住所のときは書き換えない', () => {
    renderHook(() => useSongInUrl(null, '/producers/45'));
    renderHook(() => useSongInUrl(song(1), '/producers/99'));
    expect(window.location.search).toBe('');
  });

  it('英語の住所（/en/...）でも、言語を外した住所で比べる', () => {
    window.history.replaceState(null, '', '/en/producers/45');
    renderHook(() => useSongInUrl(song(3), '/producers/45'));
    expect(window.location.pathname + window.location.search).toBe('/en/producers/45?song=3');
  });

  it('ほかの画面へ移り始めていて住所がまだ変わっていないあいだは書き換えない（移動が取り消されるため）', () => {
    startNavigation();
    renderHook(() => useSongInUrl(song(1), '/producers/45'));
    expect(window.location.search).toBe('');
    endNavigation();
  });

  it('移動中の印は、住所が変わらなくても決まった時間で外れる', () => {
    vi.useFakeTimers();
    startNavigation();
    vi.advanceTimersByTime(10_000);
    renderHook(() => useSongInUrl(song(1), '/producers/45'));
    expect(window.location.search).toBe('?song=1');
    vi.useRealTimers();
  });
});

describe('startNavigationTo（移動中の印を付ける）', () => {
  it('住所の変わる移動だけ印を付ける。言語の付いた住所でも、言語を外して比べる', () => {
    startNavigationTo('/years');
    expect(navigationPending()).toBe(true);
    endNavigation();
    startNavigationTo('/en/years?q=1');
    expect(navigationPending()).toBe(true);
    endNavigation();
  });

  it('同じ画面の中の移動（検索の ?q= など）と、サイトの外の住所では付けない', () => {
    startNavigationTo('/producers/45?song=3');
    startNavigationTo('/en/producers/45');
    startNavigationTo('https://example.com/');
    startNavigationTo('//example.com/');
    expect(navigationPending()).toBe(false);
  });
});

describe('useRadioExtension（ラジオの並びを伸ばす）', () => {
  function setup(active: boolean, queue: QueueItem[], index: number) {
    const order = queue.map((_, i) => i);
    const cursor = { current: { queue, index, order, position: index } };
    const append = vi.fn();
    renderHook(() => useRadioExtension({ active, queue, index, position: index, cursor, append }));
    return append;
  }

  it('残り1曲まで来たら、関連曲のうちまだ並びに無い曲を後ろに足す', async () => {
    const fetchMock = vi.fn(async () => Response.json([song(1), song(9)]));
    vi.stubGlobal('fetch', fetchMock);
    const append = setup(true, [song(1), song(2)], 0);
    await waitFor(() => expect(append).toHaveBeenCalledWith([song(9)]));
    expect(fetchMock).toHaveBeenCalledWith('/api/related/1');
  });

  it('ラジオでないとき・まだ終わりが遠いときは聞かない', async () => {
    const fetchMock = vi.fn(async () => Response.json([]));
    vi.stubGlobal('fetch', fetchMock);
    setup(false, [song(1), song(2)], 1);
    setup(true, [song(1), song(2), song(3), song(4)], 0);
    await new Promise((r) => setTimeout(r, 10));
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('関連曲が取れなければ何も足さない', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(null, { status: 500 })),
    );
    const append = setup(true, [song(1)], 0);
    await new Promise((r) => setTimeout(r, 10));
    expect(append).not.toHaveBeenCalled();
  });
});

describe('前回の画面の控え（アプリから開いたとき）', () => {
  it('残した住所を読む。12時間を過ぎたものと、設定で切っているときは読まない', () => {
    saveLastPage('/producers/45');
    expect(readLastPage()).toBe('/producers/45');
    setResumeEnabled(false);
    expect(readLastPage()).toBeNull();
    setResumeEnabled(true);
    localStorage.setItem(
      'vocafy-last-page',
      JSON.stringify({ path: '/years', at: Date.now() - 13 * 60 * 60 * 1000 }),
    );
    expect(readLastPage()).toBeNull();
  });

  it('サイトの中の住所でないもの・壊れた控えは読まない', () => {
    for (const raw of ['{', JSON.stringify({ path: 'https://example.com', at: Date.now() })]) {
      localStorage.setItem('vocafy-last-page', raw);
      expect(readLastPage()).toBeNull();
    }
  });
});

describe('音の出口（keep-awake）', () => {
  it('流し始めたら無音を流し続け、休ませたら止め、また流すときに開け直す。閉じたら捨てる', async () => {
    const contexts: {
      state: string;
      resume: () => void;
      suspend: () => void;
      close: () => void;
    }[] = [];
    vi.stubGlobal(
      'AudioContext',
      class {
        state = 'running';
        destination = {};
        constructor() {
          contexts.push(this as never);
        }
        createConstantSource() {
          return { offset: { value: 1 }, connect: () => {}, start: () => {} };
        }
        resume() {
          this.state = 'running';
        }
        suspend() {
          this.state = 'suspended';
        }
        close() {
          this.state = 'closed';
        }
      },
    );
    vi.resetModules();
    const { keepAwake, letSleep, rest } = await import('@/components/player/keep-awake');
    keepAwake();
    keepAwake();
    expect(contexts).toHaveLength(1);
    rest();
    expect(contexts[0].state).toBe('suspended');
    keepAwake();
    expect(contexts[0].state).toBe('running');
    letSleep();
    expect(contexts[0].state).toBe('closed');
    // 閉じたあとに休ませても何もしない。次に流すときは作り直す
    rest();
    keepAwake();
    expect(contexts).toHaveLength(2);
  });
});

describe('きょうの出会いを流すか（mix-flow）', () => {
  function media(matches: Record<string, boolean>) {
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: Object.entries(matches).some(([key, on]) => on && query.includes(key)),
      addEventListener: () => {},
      removeEventListener: () => {},
    }));
  }

  it('マウスの端末で、パソコンの幅なら流す。設定で切ったら流さない', async () => {
    const { canFlow, setMixFlowEnabled } = await import('@/lib/mix-flow');
    media({ 'pointer: fine': true, 'min-width': true });
    expect(canFlow()).toBe(true);
    setMixFlowEnabled(false);
    expect(canFlow()).toBe(false);
    setMixFlowEnabled(true);
  });

  it('指の端末・狭い幅では流さない', async () => {
    const { canFlow } = await import('@/lib/mix-flow');
    media({ 'pointer: fine': false, 'min-width': true });
    expect(canFlow()).toBe(false);
    media({ 'pointer: fine': true, 'min-width': false });
    expect(canFlow()).toBe(false);
  });
});
