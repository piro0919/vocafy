import type {
  NiconicoEngine,
  NiconicoEngineEvents,
  NiconicoEngineOptions,
} from 'niconico-embed-player';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { EngineEvents } from '@/components/player/engine';

/**
 * ニコニコのプレイヤー（niconico.ts）。埋め込みとのやりとりはパッケージ niconico-embed-player にあり、そのテストも
 * パッケージの側にある（止められたことの見分け方・前の動画の知らせを拾わないことなど）。ここでは、パッケージを偽物に替えて、
 * Vocafy の決めごと（コメントを隠す・読み上げの名前・流せない動画を知らせる）と、Vocafy のプレイヤーの形へのつなぎ方を確かめる
 */

type Made = {
  container: HTMLElement;
  options: NiconicoEngineOptions;
  events: Partial<NiconicoEngineEvents>;
  player: Record<keyof NiconicoEngine, ReturnType<typeof vi.fn>>;
};
let made: Made[] = [];

vi.mock('niconico-embed-player', () => ({
  createNiconicoEngine: (
    container: HTMLElement,
    options: NiconicoEngineOptions,
    events: Partial<NiconicoEngineEvents>,
  ) => {
    const player = {
      load: vi.fn(),
      play: vi.fn(),
      pause: vi.fn(),
      seek: vi.fn(),
      seekBy: vi.fn(),
      setVolume: vi.fn(),
      setMuted: vi.fn(),
      setCommentsHidden: vi.fn(),
      requestFullscreen: vi.fn(),
      time: vi.fn(() => ({ current: 12, duration: 200 })),
      destroy: vi.fn(),
    };
    made.push({ container, options, events, player });
    return player;
  },
}));

vi.stubGlobal('location', { pathname: '/en' });
const fetchMock = vi.fn(() => Promise.resolve(new Response()));
vi.stubGlobal('fetch', fetchMock);

const { createNiconicoEngine } = await import('@/components/player/niconico');

const container = {} as HTMLElement;
const events = (): EngineEvents & Record<string, ReturnType<typeof vi.fn>> => ({
  onPlaying: vi.fn(),
  onPaused: vi.fn(),
  onEnded: vi.fn(),
  onBlocked: vi.fn(),
  onError: vi.fn(),
});
const reported = () =>
  fetchMock.mock.calls.map((call) => {
    const [, init] = call as unknown as [string, RequestInit];
    return JSON.parse(String(init.body));
  });

beforeEach(() => {
  made = [];
  fetchMock.mockClear();
});

describe('作ったとき', () => {
  it('コメントを隠し、残しておいた音量と消音・流し始める位置・言語に合った読み上げの名前を渡す', () => {
    createNiconicoEngine(container, 'sm1', { volume: 40, muted: true }, events(), undefined, 61);
    expect(made).toHaveLength(1);
    expect(made[0].container).toBe(container);
    expect(made[0].options).toEqual({
      videoId: 'sm1',
      startAt: 61,
      volume: 40,
      muted: true,
      hideComments: true,
      title: 'Niconico video player',
      preloaded: undefined,
    });
  });

  it('先に読み込んでおいた埋め込みを渡す', () => {
    const preloaded = {
      videoId: 'sm2',
      playerId: 'p',
      iframe: {} as HTMLIFrameElement,
      box: {} as HTMLElement,
    };
    createNiconicoEngine(container, 'sm2', { volume: 100, muted: false }, events(), preloaded);
    expect(made[0].options.preloaded).toBe(preloaded);
  });
});

describe('届いた知らせ', () => {
  it('再生中・一時停止・終わり・止められたを、そのまま知らせる', () => {
    const ev = events();
    createNiconicoEngine(container, 'sm1', { volume: 100, muted: false }, ev);
    const given = made[0].events;
    given.onPlaying?.();
    given.onPaused?.();
    given.onEnded?.();
    given.onBlocked?.();
    expect(ev.onPlaying).toHaveBeenCalledTimes(1);
    expect(ev.onPaused).toHaveBeenCalledTimes(1);
    expect(ev.onEnded).toHaveBeenCalledTimes(1);
    expect(ev.onBlocked).toHaveBeenCalledTimes(1);
    expect(ev.onError).not.toHaveBeenCalled();
  });

  it('流せない動画は、Vocafy に知らせてから次へ進ませる。曲を替えたあとは新しい動画の番号で知らせる', () => {
    const ev = events();
    const engine = createNiconicoEngine(container, 'sm5', { volume: 100, muted: false }, ev);
    made[0].events.onError?.('sensitive_video');
    expect(ev.onError).toHaveBeenCalledWith({ detail: 'sensitive_video', unplayable: false });
    engine.load('sm6', 30);
    expect(made[0].player.load).toHaveBeenCalledWith('sm6', 30);
    made[0].events.onError?.('unknown');
    expect(reported()).toEqual([
      { service: 'niconico', videoId: 'sm5' },
      { service: 'niconico', videoId: 'sm6' },
    ]);
  });
});

describe('操作', () => {
  it('Vocafy のプレイヤーの形で、パッケージの操作を呼ぶ', () => {
    const engine = createNiconicoEngine(container, 'sm1', { volume: 100, muted: false }, events());
    const { player } = made[0];
    expect(engine.service).toBe('niconico');
    engine.play();
    engine.pause();
    engine.seek(42);
    engine.setVolume(30);
    engine.setMuted(true);
    expect(engine.time()).toEqual({ current: 12, duration: 200 });
    engine.destroy();
    expect(player.play).toHaveBeenCalledTimes(1);
    expect(player.pause).toHaveBeenCalledTimes(1);
    expect(player.seek).toHaveBeenCalledWith(42);
    expect(player.setVolume).toHaveBeenCalledWith(30);
    expect(player.setMuted).toHaveBeenCalledWith(true);
    expect(player.destroy).toHaveBeenCalledTimes(1);
  });
});
