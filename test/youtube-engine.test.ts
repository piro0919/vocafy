import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { EngineEvents } from '@/components/player/engine';

/**
 * YouTube のプレイヤー（youtube.ts）を、偽の IFrame API で動かす。node には document も YT も無いので、
 * 使う分だけを作る。確かめるのは、準備を待つあいだの操作の扱い・仕組みを読み込めなかったときの読み込み直し・prime・知らせ
 */

const STATE = { ENDED: 0, PLAYING: 1, PAUSED: 2 };

type Handlers = {
  onReady?: (e: { target: FakePlayer }) => void;
  onStateChange?: (e: { data: number }) => void;
  onError?: (e: { data: number }) => void;
  onAutoplayBlocked?: () => void;
};

class FakePlayer {
  calls: string[] = [];
  constructor(
    public videoId: string | undefined,
    public events: Handlers,
  ) {}
  loadVideoById(id: string | { videoId: string; startSeconds?: number }) {
    this.calls.push(
      typeof id === 'string' ? `load:${id}` : `load:${id.videoId}@${id.startSeconds}`,
    );
  }
  playVideo() {
    this.calls.push('play');
  }
  pauseVideo() {
    this.calls.push('pause');
  }
  stopVideo() {
    this.calls.push('stop');
  }
  seekTo(s: number) {
    this.calls.push(`seek:${s}`);
  }
  getCurrentTime() {
    return 12;
  }
  getDuration() {
    return 200;
  }
  setVolume(v: number) {
    this.calls.push(`volume:${v}`);
  }
  mute() {
    this.calls.push('mute');
  }
  unMute() {
    this.calls.push('unmute');
  }
  unloadModule(name: string) {
    this.calls.push(`unload:${name}`);
  }
  destroy() {
    this.calls.push('destroy');
  }
  ready() {
    this.events.onReady?.({ target: this });
  }
  state(data: number) {
    this.events.onStateChange?.({ data });
  }
}

type FakeScript = { src: string; onerror: (() => void) | null; remove: () => void };

let players: FakePlayer[];
let scripts: FakeScript[];
const win: { YT?: unknown; onYouTubeIframeAPIReady?: () => void } = {};
const fetchMock = vi.fn(() => Promise.resolve(new Response()));

vi.stubGlobal('window', win);
vi.stubGlobal('fetch', fetchMock);
vi.stubGlobal('document', {
  createElement: (tag: string) => {
    if (tag !== 'script') return { tag };
    const script: FakeScript = { src: '', onerror: null, remove: () => {} };
    script.remove = () => scripts.splice(scripts.indexOf(script), 1);
    return script;
  },
  head: { append: (s: FakeScript) => scripts.push(s) },
});

/** 仕組みの読み込みが終わった（YouTube のスクリプトが onYouTubeIframeAPIReady を呼ぶ） */
function apiLoads() {
  win.YT = {
    Player: class {
      constructor(_el: unknown, options: { videoId?: string; events: Handlers }) {
        const player = new FakePlayer(options.videoId, options.events);
        players.push(player);
        return player;
      }
    },
    PlayerState: STATE,
  };
  win.onYouTubeIframeAPIReady?.();
}

const container = () => ({ replaceChildren: vi.fn() }) as unknown as HTMLElement;
const events = (): EngineEvents & Record<string, ReturnType<typeof vi.fn>> => ({
  onPlaying: vi.fn(),
  onPaused: vi.fn(),
  onEnded: vi.fn(),
  onBlocked: vi.fn(),
  onError: vi.fn(),
});
/** Promise の続きを流しきる */
const flush = () => new Promise((resolve) => setTimeout(resolve));

// 読み込みの状態（apiReady）はモジュールの変数なので、テストごとに読み込み直す
async function load() {
  vi.resetModules();
  return (await import('@/components/player/youtube')).createYouTubeEngine;
}

beforeEach(() => {
  players = [];
  scripts = [];
  delete win.YT;
  delete win.onYouTubeIframeAPIReady;
  fetchMock.mockClear();
});

describe('準備を待つあいだ', () => {
  it('仕組みが届くまではプレイヤーを作らず、届いたら最初の曲で作る', async () => {
    const create = await load();
    create(container(), 'a', { volume: 50, muted: false }, events());
    expect(scripts).toHaveLength(1);
    expect(players).toHaveLength(0);
    apiLoads();
    await flush();
    expect(players).toHaveLength(1);
    expect(players[0].videoId).toBe('a');
  });

  it('準備のあいだに選ばれた曲があれば、準備ができたときにその曲に替える', async () => {
    const create = await load();
    const engine = create(container(), 'a', { volume: 50, muted: false }, events());
    apiLoads();
    await flush();
    engine.load('b');
    engine.load('c');
    players[0].ready();
    expect(players[0].calls).toEqual(['volume:50', 'load:c']);
  });

  it('続きの位置を渡されたら、鳴り始めてから飛ばず、その位置から流すよう頼む', async () => {
    const create = await load();
    const engine = create(container(), 'a', { volume: 50, muted: false }, events(), 30);
    apiLoads();
    await flush();
    players[0].ready();
    expect(players[0].calls).toEqual(['volume:50', 'load:a@30']);
    // 使い回して動画だけ替えるときも同じ。位置が無ければ頭から
    engine.load('b', 45);
    engine.load('c');
    expect(players[0].calls.slice(2)).toEqual(['stop', 'load:b@45', 'stop', 'load:c']);
  });

  it('準備のあいだに一時停止を押されたら、準備ができても流さない', async () => {
    const create = await load();
    const engine = create(container(), 'a', { volume: 30, muted: true }, events());
    apiLoads();
    await flush();
    engine.pause();
    players[0].ready();
    expect(players[0].calls).toEqual(['volume:30', 'mute', 'pause']);
  });

  it('動画を入れずに作ったプレイヤーは、準備ができても何も流さない', async () => {
    const create = await load();
    create(container(), '', { volume: 100, muted: false }, events());
    apiLoads();
    await flush();
    expect(players[0].videoId).toBeUndefined();
    players[0].ready();
    expect(players[0].calls).toEqual(['volume:100']);
  });

  it('準備の前に壊したら、準備ができても触らない', async () => {
    const create = await load();
    const engine = create(container(), 'a', { volume: 100, muted: false }, events());
    apiLoads();
    await flush();
    engine.destroy();
    players[0].ready();
    expect(players[0].calls).toEqual([]);
  });
});

describe('仕組みを読み込めなかったとき', () => {
  it('帯を ▶ に戻し、次に流そうとしたときに読み込み直す', async () => {
    const create = await load();
    const ev = events();
    const engine = create(container(), 'a', { volume: 100, muted: false }, ev);
    scripts[0].onerror?.();
    await flush();
    expect(ev.onBlocked).toHaveBeenCalledTimes(1);
    expect(scripts).toHaveLength(0);

    engine.play();
    expect(scripts).toHaveLength(1);
    apiLoads();
    await flush();
    players[0].ready();
    expect(players[0].calls).toEqual(['volume:100', 'play']);
  });

  it('読み込み直すのは失敗したあとだけ（読み込み中に押しても二重に読まない）', async () => {
    const create = await load();
    const engine = create(container(), 'a', { volume: 100, muted: false }, events());
    engine.play();
    engine.load('b');
    expect(scripts).toHaveLength(1);
  });

  it('読み込み直しの前に別の曲を選んだら、その曲で作る', async () => {
    const create = await load();
    const engine = create(container(), 'a', { volume: 100, muted: false }, events());
    scripts[0].onerror?.();
    await flush();
    engine.load('b');
    apiLoads();
    await flush();
    expect(players[0].videoId).toBe('b');
  });

  it('壊したあとに失敗が届いても、知らせない', async () => {
    const create = await load();
    const ev = events();
    const engine = create(container(), 'a', { volume: 100, muted: false }, ev);
    engine.destroy();
    scripts[0].onerror?.();
    await flush();
    expect(ev.onBlocked).not.toHaveBeenCalled();
  });
});

describe('準備ができたあと', () => {
  async function ready() {
    const create = await load();
    const ev = events();
    const engine = create(container(), 'a', { volume: 100, muted: false }, ev);
    apiLoads();
    await flush();
    const player = players[0];
    player.ready();
    player.calls = [];
    return { engine, ev, player };
  }

  it('曲を替えるときは、前の動画を止めてから次を頼む', async () => {
    const { engine, player } = await ready();
    engine.load('b');
    expect(player.calls).toEqual(['stop', 'load:b']);
  });

  it('流れ始めたら字幕を外して知らせる。一時停止と終わりも知らせる', async () => {
    const { ev, player } = await ready();
    player.state(STATE.PLAYING);
    player.state(STATE.PAUSED);
    player.state(STATE.ENDED);
    expect(player.calls).toEqual(['unload:captions']);
    expect(ev.onPlaying).toHaveBeenCalledTimes(1);
    expect(ev.onPaused).toHaveBeenCalledTimes(1);
    expect(ev.onEnded).toHaveBeenCalledTimes(1);
  });

  it('再生位置と長さを返す', async () => {
    const { engine } = await ready();
    expect(engine.time()).toEqual({ current: 12, duration: 200 });
  });

  it('流せない動画（100・101・150）は知らせ、ほかの番号は知らせない。どちらも次へ進ませる', async () => {
    const { ev, player } = await ready();
    for (const code of [100, 101, 150, 5]) player.events.onError?.({ data: code });
    expect(ev.onError).toHaveBeenCalledTimes(4);
    expect(ev.onError).toHaveBeenCalledWith({ detail: '100', unplayable: true });
    expect(ev.onError).toHaveBeenLastCalledWith({ detail: '5', unplayable: false });
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('自動再生を止められたら知らせる', async () => {
    const { ev, player } = await ready();
    player.events.onAutoplayBlocked?.();
    expect(ev.onBlocked).toHaveBeenCalledTimes(1);
  });
});

describe('prime（音を消して一度だけ流す）', () => {
  async function ready(muted = false) {
    const create = await load();
    const ev = events();
    const engine = create(container(), '', { volume: 100, muted }, ev);
    apiLoads();
    await flush();
    const player = players[0];
    player.ready();
    player.calls = [];
    return { engine, ev, player };
  }

  it('音を消して頼み、流れ始めたらすぐ止めて音を戻す。知らせは出さない', async () => {
    const { engine, ev, player } = await ready();
    engine.prime?.('p');
    player.state(STATE.PLAYING);
    expect(player.calls).toEqual(['mute', 'load:p', 'stop', 'unmute']);
    expect(ev.onPlaying).not.toHaveBeenCalled();
  });

  it('一度流れたら、もう prime しない', async () => {
    const { engine, player } = await ready();
    engine.prime?.('p');
    player.state(STATE.PLAYING);
    player.calls = [];
    engine.prime?.('q');
    expect(player.calls).toEqual([]);
  });

  it('消音の設定の人は、止めたあとも音を戻さない', async () => {
    const { engine, player } = await ready(true);
    engine.prime?.('p');
    player.state(STATE.PLAYING);
    expect(player.calls).toEqual(['mute', 'load:p', 'stop']);
  });

  it('prime の途中で止められたら、音を戻すだけで ▶ には戻さない', async () => {
    const { engine, ev, player } = await ready();
    engine.prime?.('p');
    player.events.onAutoplayBlocked?.();
    expect(player.calls).toEqual(['mute', 'load:p', 'unmute']);
    expect(ev.onBlocked).not.toHaveBeenCalled();
  });

  it('prime の途中で曲を選んだら、prime をやめて音を戻してから流す', async () => {
    const { engine, player } = await ready();
    engine.prime?.('p');
    engine.load('b');
    expect(player.calls).toEqual(['mute', 'load:p', 'unmute', 'stop', 'load:b']);
  });
});
