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
  /** 作ったときの音量と消音 */
  sound: Sound;
  /** 先に読み込んでおいた埋め込みを受け取って作ったか */
  preloaded?: unknown;
  /** 流し始める位置（ニコニコだけ） */
  startAt?: number;
};

const made = vi.hoisted(() => ({ list: [] as unknown[] }));
const apple = vi.hoisted(() => ({ value: false }));

function fake(service: Engine['service']) {
  return (
    _box: HTMLElement,
    videoId: string,
    sound: Sound,
    events: EngineEvents,
    preloaded?: unknown,
    startAt?: number,
  ) => {
    const calls: string[] = [];
    const engine: Fake = {
      service,
      calls,
      events,
      videoId,
      sound,
      preloaded,
      startAt,
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

function setup(startOf?: (videoId: string) => number | undefined) {
  const frame = document.createElement('div');
  document.body.append(frame);
  const soundRef = { current: sound };
  const handlersRef = { current: handlers as unknown as EngineEvents };
  const view = renderHook(() =>
    useEngines({ current: frame }, soundRef, handlersRef, () => playing, startOf),
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

  it('隠すときは display: none にせず、見えない形で重ねる。戻したら見える形に戻す', () => {
    // iPhone の Safari は、display: none の入れ物の動画には許し付けが効かなかった（2026-10-13）
    const { result, frame } = setup();
    play(result, 'youtube', 'a');
    const box = frame.firstElementChild as HTMLElement;
    play(result, 'niconico', 'sm1');
    expect(box.hidden).toBe(false);
    expect(box.classList.contains('invisible')).toBe(true);
    expect(box.classList.contains('absolute')).toBe(true);
    play(result, 'youtube', 'b');
    expect(box.classList.contains('invisible')).toBe(false);
    expect(box.classList.contains('absolute')).toBe(false);
  });

  it('iPad・iPhone で先に作っておく YouTube のプレイヤーも、display: none にせずに隠す', () => {
    apple.value = true;
    const { frame } = setup();
    const box = frame.firstElementChild as HTMLElement;
    expect(box.hidden).toBe(false);
    expect(box.classList.contains('invisible')).toBe(true);
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

describe('曲を替えている途中の一時停止', () => {
  it('前の曲を絞っている途中に押したら、帯はすぐ止まった表示にし、次の曲は鳴り始めたら消音して止める', () => {
    const { result } = setup();
    play(result, 'youtube', 'a');
    const yt = last();
    act(() => yt.events.onPlaying());
    play(result, 'youtube', 'b');
    act(() => result.current.pause());
    expect(handlers.onPaused).toHaveBeenCalledTimes(1);
    // 絞っている途中で消音すると音が途切れるので、絞りきるまでは任せる
    expect(yt.calls).not.toContain('muted:true');
    act(() => vi.advanceTimersByTime(FADE_TOTAL + PAUSE_WAIT_MS));
    expect(yt.calls.at(-1)).toBe('load:b');
    yt.calls.length = 0;
    act(() => yt.events.onPlaying());
    expect(yt.calls).toEqual(['muted:true', 'pause']);
    expect(handlers.onPlaying).toHaveBeenCalledTimes(1);
  });

  it('次の曲を読み込んでいる途中に押したら、すぐ消音して止め、鳴り始めても止めたままにする', () => {
    const { result } = setup();
    play(result, 'youtube', 'a');
    play(result, 'youtube', 'b');
    const yt = last();
    yt.calls.length = 0;
    act(() => result.current.pause());
    expect(yt.calls).toEqual(['muted:true', 'pause']);
    expect(handlers.onPaused).toHaveBeenCalledTimes(1);
    // YouTube は読み込み終わると、止めていても流し始める
    yt.calls.length = 0;
    act(() => yt.events.onPlaying());
    expect(yt.calls).toEqual(['muted:true', 'pause']);
    expect(handlers.onPlaying).not.toHaveBeenCalled();
  });

  it('iPad・iPhone で、鳴っている曲からすぐ替えた次の曲の読み込み中に押しても、鳴り始めたら止める', () => {
    // 絞らずにすぐ替えるので、前の曲が鳴っている印が残り、押した一時停止が次の曲に効かなかった（2026-10-13）
    apple.value = true;
    const { result } = setup();
    play(result, 'youtube', 'a');
    act(() => last().events.onPlaying());
    play(result, 'niconico', 'sm1');
    const nico = last();
    act(() => result.current.pause());
    expect(handlers.onPaused).toHaveBeenCalledTimes(1);
    nico.calls.length = 0;
    act(() => nico.events.onPlaying());
    expect(nico.calls).toEqual(['muted:true', 'pause']);
    expect(handlers.onPlaying).toHaveBeenCalledTimes(1);
  });

  it('止めたあとに再生を押したら、鳴り始めたときに消音を解いて音量を戻す', () => {
    const { result } = setup();
    play(result, 'youtube', 'a');
    act(() => result.current.pause());
    const yt = last();
    act(() => yt.events.onPlaying());
    yt.calls.length = 0;
    act(() => result.current.play());
    expect(yt.calls).toEqual(['play']);
    act(() => yt.events.onPlaying());
    act(() => vi.advanceTimersByTime(FADE_OUT_MS));
    expect(handlers.onPlaying).toHaveBeenCalledTimes(1);
    expect(yt.calls.slice(1, 3)).toEqual(['volume:0', 'muted:false']);
    expect(yt.calls.at(-1)).toBe('volume:80');
  });

  it('止めたあとに別の曲を選んだら、その曲は流す', () => {
    const { result } = setup();
    play(result, 'youtube', 'a');
    act(() => result.current.pause());
    play(result, 'youtube', 'b');
    act(() => last().events.onPlaying());
    expect(handlers.onPlaying).toHaveBeenCalledTimes(1);
  });

  it('止めたまま別の仕組みの曲へ替わるときは、新しいプレイヤーを消音で作る', () => {
    const { result } = setup();
    play(result, 'youtube', 'a');
    act(() => last().events.onPlaying());
    play(result, 'niconico', 'sm1');
    act(() => result.current.pause());
    act(() => vi.advanceTimersByTime(FADE_TOTAL + PAUSE_WAIT_MS));
    expect(last().service).toBe('niconico');
    expect(last().sound).toEqual({ volume: 80, muted: true });
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

  it('iPad・iPhone では、reset のあとも空の YouTube のプレイヤーを作り直し、次の YouTube の曲で使う', () => {
    // 作り直さずにいたころは、プレイヤーを閉じたあとに押した YouTube の曲が止められた（2026-10-14、iPhone で）
    apple.value = true;
    const { result, frame } = setup();
    play(result, 'youtube', 'a');
    act(() => result.current.reset());
    expect(frame.children).toHaveLength(1);
    const warmed = last();
    expect(warmed.calls).not.toContain('destroy');
    play(result, 'youtube', 'b');
    expect(last()).toBe(warmed);
    expect(warmed.calls).toContain('load:b');
  });

  it('知らせは、いま流しているプレイヤーのものだけを handlers に渡す', () => {
    const { result } = setup();
    play(result, 'youtube', 'a');
    const yt = last();
    act(() => yt.events.onPlaying());
    act(() => yt.events.onError({ detail: '5', unplayable: false }));
    act(() => yt.events.onBlocked());
    expect(handlers.onPlaying).toHaveBeenCalledTimes(1);
    expect(handlers.onError).toHaveBeenCalledTimes(1);
    expect(handlers.onBlocked).toHaveBeenCalledTimes(1);
  });
});

describe('流し始める位置（開き直して戻したニコニコの曲の続き）', () => {
  it('曲を替えるときに渡した位置で、ニコニコのプレイヤーを作る。YouTube には渡さない', () => {
    const { result } = setup();
    act(() => result.current.change(() => result.current.switchTo('niconico', 'sm1', 61)));
    expect(last()).toMatchObject({ service: 'niconico', startAt: 61 });
    act(() => result.current.change(() => result.current.switchTo('youtube', 'a', 61)));
    expect(last()).toMatchObject({ service: 'youtube', startAt: undefined });
  });

  it('先読みする埋め込みの住所に、その曲の続きの位置を付ける', () => {
    apple.value = true;
    const { result, frame } = setup((id) => (id === 'sm1' ? 122 : undefined));
    act(() => void result.current.preload('sm1'));
    act(() => void result.current.preload('sm2'));
    const srcs = [...frame.querySelectorAll('iframe')].map((f) => f.getAttribute('src') ?? '');
    expect(srcs.find((src) => src.includes('/watch/sm1'))).toContain('&from=122');
    expect(srcs.find((src) => src.includes('/watch/sm2'))).not.toContain('from=');
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
    play(result, 'niconico', 'sm1');
    act(() => void result.current.preload('sm1'));
    expect(frame.querySelector('iframe[src*="vocafy-pre"]')).toBeNull();
  });

  it('プレイヤーがまだ無いとき（開き直して前の曲を戻しただけ）は、その曲も先読みする', () => {
    apple.value = true;
    playing = 'sm1';
    const { result, frame } = setup();
    act(() => void result.current.preload('sm1'));
    expect(frame.querySelector('iframe[src*="vocafy-pre"]')?.getAttribute('src')).toContain(
      '/watch/sm1',
    );
  });

  it('押されて渡した曲は、別の曲に替わったら、行が見えたままなら読み込み直す', () => {
    apple.value = true;
    const { result, frame } = setup();
    act(() => void result.current.preload('sm1'));
    loaded(frame);
    playing = 'sm1';
    play(result, 'niconico', 'sm1');
    expect(frame.querySelectorAll('iframe[src*="vocafy-pre"]')).toHaveLength(1);
    playing = 'sm2';
    play(result, 'niconico', 'sm2');
    expect(frame.querySelectorAll('iframe[src*="vocafy-pre"]')).toHaveLength(2);
  });
});
