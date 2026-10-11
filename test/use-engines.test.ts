// @vitest-environment happy-dom
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Engine, EngineEvents, Sound } from '@/components/player/engine';
import { FADE_OUT_MS, PAUSE_WAIT_MS, SETTLE_MS } from '@/components/player/fade';

// vitest の globals を使っていないので、描いた部品はテストごとに自分で片付ける（残すと受け口が重なる）
afterEach(cleanup);

/**
 * プレイヤーの持ち方と音の切り替え（use-engines.ts）。YouTube とニコニコのプレイヤーを偽物に差し替え、
 * 偽の時計で、絞ってから替える・止める流れと、YouTube のプレイヤーを隠して使い回す流れを確かめる
 */

type Fake = Engine & {
  calls: string[];
  events: EngineEvents;
  videoId: string;
  /** 先に読み込んでおいた埋め込みを受け取って作ったか */
  preloaded?: unknown;
};

const made = vi.hoisted(() => ({ list: [] as unknown[] }));
const apple = vi.hoisted(() => ({ value: false }));

function fake(service: Engine['service']) {
  return (
    _box: HTMLElement,
    videoId: string,
    _sound: Sound,
    events: EngineEvents,
    preloaded?: unknown,
  ) => {
    const calls: string[] = [];
    const engine: Fake = {
      service,
      calls,
      events,
      videoId,
      preloaded,
      load: (id) => calls.push(`load:${id}`),
      play: () => calls.push('play'),
      pause: () => calls.push('pause'),
      seek: (s) => calls.push(`seek:${s}`),
      setVolume: (v) => calls.push(`volume:${v}`),
      setMuted: (m) => calls.push(`muted:${m}`),
      time: () => ({ current: 0, duration: 0 }),
      prime: (id) => calls.push(`prime:${id}`),
      destroy: () => calls.push('destroy'),
    };
    made.list.push(engine);
    return engine;
  };
}

vi.mock('@/components/player/youtube', () => ({ createYouTubeEngine: fake('youtube') }));
vi.mock('@/components/player/niconico', () => ({ createNiconicoEngine: fake('niconico') }));
vi.mock('@/lib/apple-device', () => ({ isAppleDevice: () => apple.value }));

const { useEngines } = await import('@/components/player/use-engines');

/** 絞りきって（10刻み）0 が効くのを待ち、止まりきるのを待つまで */
const FADE_TOTAL = FADE_OUT_MS + SETTLE_MS;

let sound: Sound;
let playing: string | undefined;
let handlers: Record<keyof EngineEvents, ReturnType<typeof vi.fn>>;
const engines = () => made.list as Fake[];
const last = () => engines().at(-1)!;

function setup() {
  const frame = document.createElement('div');
  document.body.append(frame);
  const soundRef = { current: sound };
  const handlersRef = { current: handlers as unknown as EngineEvents };
  const view = renderHook(() =>
    useEngines({ current: frame }, soundRef, handlersRef, () => playing),
  );
  return { ...view, frame, soundRef };
}

/** 曲を替える（provider の load と同じ呼び方） */
function play(r: ReturnType<typeof setup>['result'], service: Engine['service'], videoId: string) {
  act(() => r.current.change(() => r.current.switchTo(service, videoId)));
}

beforeEach(() => {
  vi.useFakeTimers();
  made.list = [];
  apple.value = false;
  sound = { volume: 80, muted: false };
  playing = undefined;
  handlers = {
    onPlaying: vi.fn(),
    onPaused: vi.fn(),
    onEnded: vi.fn(),
    onBlocked: vi.fn(),
    onError: vi.fn(),
  };
});
afterEach(() => {
  vi.useRealTimers();
  document.body.innerHTML = '';
});

describe('曲を替える', () => {
  it('何も流していなければ、すぐにプレイヤーを作って流す', () => {
    const { result, frame } = setup();
    play(result, 'youtube', 'a');
    expect(engines()).toHaveLength(1);
    expect(last().videoId).toBe('a');
    expect(frame.children).toHaveLength(1);
  });

  it('同じ仕組みの曲が続くなら、プレイヤーを使い回して動画だけ替える', () => {
    const { result } = setup();
    play(result, 'youtube', 'a');
    play(result, 'youtube', 'b');
    expect(engines()).toHaveLength(1);
    expect(last().calls).toEqual(['load:b', 'volume:80']);
  });

  it('鳴っている途中なら、絞りきって消音・一時停止し、止まりきってから次を頼む。鳴り始めたら音を戻す', () => {
    const { result } = setup();
    play(result, 'youtube', 'a');
    const yt = last();
    act(() => yt.events.onPlaying());
    play(result, 'youtube', 'b');
    // 絞っているあいだは替えない
    expect(yt.calls).not.toContain('load:b');
    act(() => vi.advanceTimersByTime(FADE_TOTAL));
    expect(yt.calls.slice(-2)).toEqual(['muted:true', 'pause']);
    act(() => vi.advanceTimersByTime(PAUSE_WAIT_MS));
    expect(yt.calls.at(-1)).toBe('load:b');
    // 絞りきったまま頼んだので、音量はまだ戻さない
    expect(yt.calls.filter((c) => c === 'volume:80')).toHaveLength(0);
    // 替えるための一時停止の知らせは、帯に伝えない
    act(() => yt.events.onPaused());
    expect(handlers.onPaused).not.toHaveBeenCalled();
    // 鳴り始めたら、消音を解いて少しずつ元の音量へ
    yt.calls.length = 0;
    act(() => yt.events.onPlaying());
    act(() => vi.advanceTimersByTime(FADE_OUT_MS));
    expect(yt.calls[0]).toBe('volume:0');
    expect(yt.calls[1]).toBe('muted:false');
    expect(yt.calls.at(-1)).toBe('volume:80');
  });

  it('絞っているあいだに何度も選ばれたら、最後に選ばれた曲だけに替える', () => {
    const { result } = setup();
    play(result, 'youtube', 'a');
    act(() => last().events.onPlaying());
    play(result, 'youtube', 'b');
    play(result, 'youtube', 'c');
    act(() => vi.advanceTimersByTime(FADE_TOTAL + PAUSE_WAIT_MS));
    const loads = last().calls.filter((c) => c.startsWith('load:'));
    expect(loads).toEqual(['load:c']);
  });

  it('消音・音量 0・iPad では絞らずにすぐ替える', () => {
    for (const setupSound of [
      { volume: 80, muted: true },
      { volume: 0, muted: false },
    ]) {
      made.list = [];
      sound = setupSound;
      const { result, unmount } = setup();
      play(result, 'youtube', 'a');
      act(() => last().events.onPlaying());
      play(result, 'youtube', 'b');
      expect(last().calls).toContain('load:b');
      unmount();
    }
    made.list = [];
    sound = { volume: 80, muted: false };
    apple.value = true;
    const { result } = setup();
    // iPad では開いたときに空の YouTube のプレイヤーを作って隠しておく
    expect(engines()).toHaveLength(1);
    play(result, 'youtube', 'a');
    act(() => last().events.onPlaying());
    play(result, 'youtube', 'b');
    expect(last().calls).toContain('load:b');
  });
});

describe('YouTube とニコニコの行き来', () => {
  it('ニコニコの曲のあいだ、YouTube のプレイヤーは壊さず止めて隠し、YouTube に戻ったら使い回す', () => {
    const { result } = setup();
    play(result, 'youtube', 'a');
    const yt = last();
    play(result, 'niconico', 'sm1');
    const nico = last();
    expect(yt.calls).toContain('pause');
    expect(yt.calls).not.toContain('destroy');
    play(result, 'youtube', 'b');
    // ニコニコのプレイヤーは壊し、隠していた YouTube のプレイヤーで次を流す
    expect(nico.calls).toContain('destroy');
    expect(yt.calls.slice(-3)).toEqual(['muted:false', 'volume:80', 'load:b']);
    expect(engines()).toHaveLength(2);
  });

  it('隠しているプレイヤーの知らせは、帯に伝えない', () => {
    const { result } = setup();
    play(result, 'youtube', 'a');
    const yt = last();
    play(result, 'niconico', 'sm1');
    act(() => yt.events.onPaused());
    act(() => yt.events.onEnded());
    expect(handlers.onPaused).not.toHaveBeenCalled();
    expect(handlers.onEnded).not.toHaveBeenCalled();
  });

  it('隠している YouTube のプレイヤーに、並びの YouTube の曲で許しを付ける。YouTube の曲が無ければ何もしない', () => {
    const { result } = setup();
    play(result, 'youtube', 'a');
    const yt = last();
    play(result, 'niconico', 'sm1');
    const item = (service: 'youtube' | 'niconico', videoId: string) =>
      ({ service, videoId }) as never;
    act(() => result.current.primeParked([item('niconico', 'sm2')]));
    expect(yt.calls.some((c) => c.startsWith('prime:'))).toBe(false);
    act(() => result.current.primeParked([item('niconico', 'sm2'), item('youtube', 'z')]));
    expect(yt.calls.at(-1)).toBe('prime:z');
  });
});

describe('一時停止', () => {
  it('鳴っているなら絞りきってから止め、音量は 0 のまま残す', () => {
    const { result } = setup();
    play(result, 'youtube', 'a');
    const yt = last();
    act(() => yt.events.onPlaying());
    act(() => result.current.pause());
    expect(result.current.pausingSoftly()).toBe(true);
    expect(yt.calls).not.toContain('pause');
    act(() => vi.advanceTimersByTime(FADE_TOTAL));
    expect(yt.calls.at(-1)).toBe('pause');
    expect(result.current.pausingSoftly()).toBe(false);
  });

  it('絞っている途中にもう一度押したら、止めるのをやめて音量を戻す', () => {
    const { result } = setup();
    play(result, 'youtube', 'a');
    const yt = last();
    act(() => yt.events.onPlaying());
    act(() => result.current.pause());
    act(() => vi.advanceTimersByTime(FADE_OUT_MS / 2));
    act(() => result.current.pause());
    act(() => vi.advanceTimersByTime(FADE_OUT_MS * 2));
    expect(yt.calls).not.toContain('pause');
    expect(yt.calls.at(-1)).toBe('volume:80');
  });

  it('音が出ていなければ（読み込み中など）すぐ止める', () => {
    const { result } = setup();
    play(result, 'youtube', 'a');
    act(() => result.current.pause());
    expect(last().calls.at(-1)).toBe('pause');
  });

  it('曲を替えるときは、一時停止の前の絞りをやめる', () => {
    const { result } = setup();
    play(result, 'youtube', 'a');
    const yt = last();
    act(() => yt.events.onPlaying());
    act(() => result.current.pause());
    act(() => result.current.stopPauseFade());
    act(() => vi.advanceTimersByTime(FADE_TOTAL));
    expect(yt.calls).not.toContain('pause');
    expect(result.current.pausingSoftly()).toBe(false);
  });
});

describe('音量と後片付け', () => {
  it('つまみを動かしたら、その音量にして消音を解く', () => {
    const { result } = setup();
    play(result, 'youtube', 'a');
    act(() => result.current.setVolume(30));
    expect(last().calls.slice(-2)).toEqual(['volume:30', 'muted:false']);
  });

  it('reset で、流しているプレイヤーも隠しているプレイヤーも壊し、入れ物も外す', () => {
    const { result, frame } = setup();
    play(result, 'youtube', 'a');
    const yt = last();
    play(result, 'niconico', 'sm1');
    const nico = last();
    act(() => result.current.reset());
    expect(yt.calls).toContain('destroy');
    expect(nico.calls).toContain('destroy');
    expect(frame.children).toHaveLength(0);
    expect(result.current.player.current).toBeNull();
  });

  it('知らせは、いま流しているプレイヤーのものだけを handlers に渡す', () => {
    const { result } = setup();
    play(result, 'youtube', 'a');
    const yt = last();
    act(() => yt.events.onPlaying());
    act(() => yt.events.onError());
    act(() => yt.events.onBlocked());
    expect(handlers.onPlaying).toHaveBeenCalledTimes(1);
    expect(handlers.onError).toHaveBeenCalledTimes(1);
    expect(handlers.onBlocked).toHaveBeenCalledTimes(1);
  });
});

describe('ニコニコの曲の先読み（iPad・iPhone だけ）', () => {
  /** 先読みの埋め込みが読み込み終わった（埋め込みからの知らせ） */
  function loaded(frame: HTMLElement) {
    const src = frame.querySelector('iframe')?.getAttribute('src') ?? '';
    const playerId = new URL(src).searchParams.get('playerId');
    const e = new MessageEvent('message', {
      origin: 'https://embed.nicovideo.jp',
      data: { eventName: 'loadComplete', playerId },
    });
    act(() => {
      window.dispatchEvent(e);
    });
  }

  it('ほかの端末では先読みしない', () => {
    const { result, frame } = setup();
    act(() => void result.current.preload('sm1'));
    expect(frame.querySelector('iframe')).toBeNull();
  });

  it('見えた曲の埋め込みを隠して読み込み、読み込み済みなら、曲を替えるときにそれで流す', () => {
    apple.value = true;
    const { result, frame } = setup();
    act(() => void result.current.preload('sm1'));
    expect(frame.querySelector('iframe')?.getAttribute('src')).toContain('/watch/sm1');
    loaded(frame);
    play(result, 'niconico', 'sm1');
    expect(last().service).toBe('niconico');
    expect(last().preloaded).toMatchObject({ videoId: 'sm1' });
  });

  it('読み込みが終わる前に押された曲は、新しく埋め込みを作って流す', () => {
    apple.value = true;
    const { result, frame } = setup();
    act(() => void result.current.preload('sm1'));
    play(result, 'niconico', 'sm1');
    expect(last().preloaded).toBeUndefined();
    expect(frame).toBeDefined();
  });

  it('いま流している曲は先読みしない', () => {
    apple.value = true;
    playing = 'sm1';
    const { result, frame } = setup();
    act(() => void result.current.preload('sm1'));
    expect(frame.querySelector('iframe')).toBeNull();
  });
});
