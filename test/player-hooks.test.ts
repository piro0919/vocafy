// @vitest-environment happy-dom
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { QueueItem } from '@/lib/catalog';
import type { Owner, PlaybackTime } from '@/components/player/player-types';

/**
 * プレイヤーのフック（置き場所の待ち・開き直し用の控え・画面を消させない・画面の引き継ぎ）。
 * DOM の大きさを測らないものだけを、happy-dom の上で動かす
 */

const player = vi.hoisted(() => ({ value: {} as Record<string, unknown> }));
vi.mock('@/components/player/player-provider', () => ({ usePlayer: () => player.value }));

const { useSlot } = await import('@/components/player/use-slot');
const { useResumeWriter } = await import('@/components/player/use-resume-writer');
const { useWakeLock } = await import('@/components/player/use-wake-lock');
const { useTakeOver } = await import('@/components/player/use-take-over');
const { usePreload } = await import('@/components/player/use-preload');

const song = (songId: number, producerId = 1): QueueItem => ({
  songId,
  title: `曲${songId}`,
  service: 'youtube',
  videoId: `yt${songId}`,
  thumb: '',
  producerId,
  producerName: `P${producerId}`,
  vocalists: '',
});

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('useSlot（置き場所を待つ・持ち続ける）', () => {
  it('holdSlot は3秒で切れ、そのあいだに置き場所ができたらすぐやめる', () => {
    const { result } = renderHook(() => useSlot());
    act(() => result.current.holdSlot());
    expect(result.current.holdingSlot).toBe(true);
    act(() => vi.advanceTimersByTime(2999));
    expect(result.current.holdingSlot).toBe(true);
    act(() => vi.advanceTimersByTime(1));
    expect(result.current.holdingSlot).toBe(false);

    act(() => result.current.holdSlot());
    const el = document.createElement('div');
    act(() => result.current.setSlot(el));
    expect(result.current.holdingSlot).toBe(false);
    expect(result.current.slot).toBe(el);
  });

  it('置き場所が外れても（null）、持ち続けはやめない', () => {
    const { result } = renderHook(() => useSlot());
    act(() => result.current.holdSlot());
    act(() => result.current.setSlot(null));
    expect(result.current.holdingSlot).toBe(true);
  });

  it('waitForSlot は1秒で切れ、false でやめる。もう一度呼ぶと待ち直す', () => {
    const { result } = renderHook(() => useSlot());
    act(() => result.current.waitForSlot());
    act(() => vi.advanceTimersByTime(600));
    act(() => result.current.waitForSlot());
    act(() => vi.advanceTimersByTime(600));
    expect(result.current.waitingForSlot).toBe(true);
    act(() => vi.advanceTimersByTime(400));
    expect(result.current.waitingForSlot).toBe(false);

    act(() => result.current.waitForSlot());
    act(() => result.current.waitForSlot(false));
    expect(result.current.waitingForSlot).toBe(false);
  });
});

describe('useResumeWriter（開き直し用の控え）', () => {
  const owner: Owner = { kind: 'producer', producerId: 1 };
  const time = (current: number): PlaybackTime => ({ current, duration: 200, at: 0 });
  type Props = Parameters<typeof useResumeWriter>[1];
  const base: Props = {
    resumable: false,
    playing: true,
    time: time(0),
    queue: [song(1), song(2)],
    index: 0,
    owner,
  };

  function setup(
    props: Props,
    snapshot = vi.fn<Parameters<typeof useResumeWriter>[0]>(
      () => ({ queue: props.queue }) as never,
    ),
  ) {
    const view = renderHook((p: Props) => useResumeWriter(snapshot, p), { initialProps: props });
    return { ...view, snapshot };
  }

  beforeEach(() => localStorage.clear());

  it('並びや曲が替わったら書く', () => {
    const { rerender, snapshot } = setup(base);
    expect(snapshot).toHaveBeenCalledTimes(1);
    rerender({ ...base, index: 1 });
    expect(snapshot).toHaveBeenCalledTimes(2);
  });

  it('流しているあいだの時刻は、5秒ごとに間引いて書く', () => {
    const { rerender, snapshot } = setup(base);
    rerender({ ...base, time: time(1) });
    expect(snapshot).toHaveBeenCalledTimes(1);
    act(() => vi.advanceTimersByTime(5001));
    rerender({ ...base, time: time(6) });
    expect(snapshot).toHaveBeenCalledTimes(2);
  });

  it('止めているあいだの時刻では書かない', () => {
    const { rerender, snapshot } = setup({ ...base, playing: false });
    act(() => vi.advanceTimersByTime(6000));
    rerender({ ...base, playing: false, time: time(9) });
    expect(snapshot).toHaveBeenCalledTimes(1);
  });

  it('ページを離れるときに書く', () => {
    const { snapshot } = setup(base);
    window.dispatchEvent(new Event('pagehide'));
    expect(snapshot).toHaveBeenCalledTimes(2);
  });

  it('戻したまま流していないあいだ（resumable）と、並びが空のときは書かない', () => {
    const { snapshot } = setup({ ...base, resumable: true });
    window.dispatchEvent(new Event('pagehide'));
    expect(snapshot).not.toHaveBeenCalled();
    const empty = setup({ ...base, queue: [] });
    expect(empty.snapshot).not.toHaveBeenCalled();
  });

  it('控えが作れない（null）ときは何も残さない', () => {
    setup(
      base,
      vi.fn(() => null),
    );
    expect(localStorage.length).toBe(0);
  });
});

describe('useWakeLock（流しているあいだ画面を消させない）', () => {
  type Sentinel = EventTarget & { release: ReturnType<typeof vi.fn<() => Promise<void>>> };
  let sentinels: Sentinel[];
  let request: ReturnType<typeof vi.fn>;
  let visibility: DocumentVisibilityState;

  beforeEach(() => {
    vi.useRealTimers();
    sentinels = [];
    visibility = 'visible';
    request = vi.fn(async () => {
      const s = Object.assign(new EventTarget(), {
        release: vi.fn(async () => void s.dispatchEvent(new Event('release'))),
      });
      sentinels.push(s);
      return s;
    });
    Object.defineProperty(navigator, 'wakeLock', { value: { request }, configurable: true });
    Object.defineProperty(document, 'visibilityState', {
      get: () => visibility,
      configurable: true,
    });
  });
  const flush = () => act(async () => {});

  it('流しはじめたら取り、止めたら返す', async () => {
    const { rerender } = renderHook((active: boolean) => useWakeLock(active), {
      initialProps: true,
    });
    await flush();
    expect(request).toHaveBeenCalledWith('screen');
    rerender(false);
    expect(sentinels[0].release).toHaveBeenCalled();
  });

  it('ほかのアプリから戻ってきたら取り直す。取っているあいだは二重に取らない', async () => {
    renderHook(() => useWakeLock(true));
    await flush();
    document.dispatchEvent(new Event('visibilitychange'));
    await flush();
    expect(request).toHaveBeenCalledTimes(1);
    // ブラウザが外した（裏に回した）
    await act(() => sentinels[0].release());
    document.dispatchEvent(new Event('visibilitychange'));
    await flush();
    expect(request).toHaveBeenCalledTimes(2);
  });

  it('見えていないあいだは取らない', async () => {
    visibility = 'hidden';
    renderHook(() => useWakeLock(true));
    await flush();
    expect(request).not.toHaveBeenCalled();
  });

  it('取れるのを待つあいだに止めたら、取れたものをすぐ返す', async () => {
    const { unmount } = renderHook(() => useWakeLock(true));
    unmount();
    await flush();
    expect(sentinels[0].release).toHaveBeenCalled();
  });

  it('断られても黙って諦める', async () => {
    request.mockRejectedValueOnce(new Error('NotAllowedError'));
    renderHook(() => useWakeLock(true));
    await expect(flush()).resolves.toBeUndefined();
  });
});

describe('useTakeOver（動画を大きく出す画面の引き継ぎ）', () => {
  const items = [song(1), song(2), song(3)];
  const page = { kind: 'favorites' } as const;
  let takeOver: ReturnType<typeof vi.fn>;
  const set = (values: Record<string, unknown>) => {
    player.value = {
      current: song(2),
      owner: { kind: 'loose' },
      holdingSlot: false,
      takeOver,
      ...values,
    };
  };

  beforeEach(() => {
    takeOver = vi.fn();
  });

  it('流している曲が一覧にあれば、一覧を並びにしてその曲から続ける', () => {
    set({});
    renderHook(() => useTakeOver(items, page));
    expect(takeOver).toHaveBeenCalledWith(items, 1, page);
  });

  it('一覧に無い曲・何も流していないときは引き継がない', () => {
    set({ current: song(9) });
    renderHook(() => useTakeOver(items, page));
    set({ current: null });
    renderHook(() => useTakeOver(items, page));
    expect(takeOver).not.toHaveBeenCalled();
  });

  it('もう持ち主なら引き継がず、持ち主であることを返す', () => {
    set({ owner: { kind: 'favorites' } });
    const { result } = renderHook(() => useTakeOver(items, page));
    expect(result.current).toBe(true);
    expect(takeOver).not.toHaveBeenCalled();
  });

  it('ボカロPの画面へ移る途中（pending）と、画面を移っている途中（holdingSlot）は引き継がない', () => {
    set({ owner: { kind: 'pending' } });
    renderHook(() => useTakeOver(items, page));
    set({ holdingSlot: true });
    renderHook(() => useTakeOver(items, page));
    expect(takeOver).not.toHaveBeenCalled();
  });
});

describe('usePreload（見えているニコニコの曲の行を先読みさせる）', () => {
  type Callback = (entries: { target: Element; isIntersecting: boolean }[]) => void;
  let observed: Element[];
  let fire: Callback;
  let disconnected: boolean;
  let preload: ReturnType<typeof vi.fn<(id: string) => () => void>>;
  let releases: Record<string, ReturnType<typeof vi.fn<() => void>>>;

  beforeEach(() => {
    observed = [];
    disconnected = false;
    releases = {};
    preload = vi.fn((id: string) => (releases[id] = vi.fn<() => void>()));
    player.value = { preload };
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        constructor(callback: Callback) {
          fire = callback;
        }
        observe(el: Element) {
          observed.push(el);
        }
        disconnect() {
          disconnected = true;
        }
      },
    );
  });
  afterEach(() => vi.unstubAllGlobals());

  function list() {
    const root = document.createElement('ul');
    root.innerHTML = '<li data-preload="sm1"></li><li></li><li data-preload="sm2"></li>';
    return root;
  }

  it('data-preload の行だけを見張り、見えたら先読みさせ、外れたら手放す', () => {
    const root = list();
    renderHook(() => usePreload({ current: root }, 'a'));
    expect(observed).toHaveLength(2);
    const [a, b] = observed;
    act(() =>
      fire([
        { target: a, isIntersecting: true },
        { target: b, isIntersecting: true },
      ]),
    );
    expect(preload.mock.calls.map((c) => c[0])).toEqual(['sm1', 'sm2']);
    // 見えたままもう一度届いても、二重に頼まない
    act(() => fire([{ target: a, isIntersecting: true }]));
    expect(preload).toHaveBeenCalledTimes(2);
    act(() => fire([{ target: a, isIntersecting: false }]));
    expect(releases.sm1).toHaveBeenCalledTimes(1);
  });

  it('外したら見張りをやめ、見えていた行をすべて手放す', () => {
    const root = list();
    const { unmount } = renderHook(() => usePreload({ current: root }, 'a'));
    act(() => fire([{ target: observed[1], isIntersecting: true }]));
    unmount();
    expect(disconnected).toBe(true);
    expect(releases.sm2).toHaveBeenCalledTimes(1);
  });

  it('行そのものが data-preload を持つときも見張る。持つ行が無ければ見張らない', () => {
    const row = document.createElement('div');
    row.dataset.preload = 'sm9';
    renderHook(() => usePreload({ current: row }, 'a'));
    expect(observed).toEqual([row]);
    observed = [];
    renderHook(() => usePreload({ current: document.createElement('div') }, 'b'));
    expect(observed).toEqual([]);
  });
});
