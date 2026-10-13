import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { EngineEvents } from '@/components/player/engine';

/**
 * ニコニコのプレイヤー（niconico.ts）を、偽の iframe と message の知らせで動かす。node には document も window も無いので、
 * 使う分だけを作る。確かめるのは、送る知らせ・前の動画の知らせを拾わないこと・届いた知らせの扱い
 */

const ORIGIN = 'https://embed.nicovideo.jp';

type Sent = { eventName: string; data?: Record<string, unknown>; playerId: string };

class FakeIframe {
  allow = '';
  title = '';
  src = '';
  sent: Sent[] = [];
  removed = false;
  contentWindow = {
    postMessage: (message: Sent, origin: string) => {
      if (origin === ORIGIN) this.sent.push(message);
    },
  };
  remove() {
    this.removed = true;
  }
  get playerId() {
    return new URL(this.src).searchParams.get('playerId') ?? '';
  }
}

const win = new EventTarget();
vi.stubGlobal('window', win);
vi.stubGlobal('location', { pathname: '/' });
vi.stubGlobal('document', { createElement: () => new FakeIframe() });
const fetchMock = vi.fn(() => Promise.resolve(new Response()));
vi.stubGlobal('fetch', fetchMock);

const { createNiconicoEngine } = await import('@/components/player/niconico');

let frames: FakeIframe[];
const container = {
  replaceChildren: (frame: FakeIframe) => frames.push(frame),
} as unknown as HTMLElement;
const events = (): EngineEvents & Record<string, ReturnType<typeof vi.fn>> => ({
  onPlaying: vi.fn(),
  onPaused: vi.fn(),
  onEnded: vi.fn(),
  onBlocked: vi.fn(),
  onError: vi.fn(),
});

/** 埋め込みからの知らせ */
function receive(
  playerId: string,
  eventName: string,
  data?: Record<string, number>,
  origin = ORIGIN,
) {
  const e = new Event('message') as Event & { origin: string; data: unknown };
  Object.assign(e, { origin, data: { eventName, playerId, data } });
  win.dispatchEvent(e);
}
const names = (frame: FakeIframe) => frame.sent.map((m) => m.eventName);

let destroyers: (() => void)[];
function create(videoId = 'sm1', sound = { volume: 40, muted: false }) {
  const ev = events();
  const engine = createNiconicoEngine(container, videoId, sound, ev);
  destroyers.push(engine.destroy);
  return { engine, ev, frame: frames.at(-1)! };
}

beforeEach(() => {
  // 前のテストの受け口を外す（外さないと、同じ window に届く知らせを拾い続ける）
  destroyers?.forEach((d) => d());
  destroyers = [];
  frames = [];
  fetchMock.mockClear();
});

describe('作ったとき', () => {
  it('動画の番号と playerId を付けた埋め込みを置く', () => {
    const { frame } = create('sm9');
    const url = new URL(frame.src);
    expect(url.origin + url.pathname).toBe(`${ORIGIN}/watch/sm9`);
    expect(url.searchParams.get('jsapi')).toBe('1');
    expect(frame.playerId).toMatch(/^vocafy-\d+$/);
    expect(frame.allow).toContain('autoplay');
  });

  it('流し始める位置を、住所の from で渡す。再生の前にシークは送らない', () => {
    const ev = events();
    const engine = createNiconicoEngine(
      container,
      'sm9',
      { volume: 40, muted: false },
      ev,
      undefined,
      61.5,
    );
    destroyers.push(engine.destroy);
    const frame = frames.at(-1)!;
    expect(new URL(frame.src).searchParams.get('from')).toBe('61');
    receive(frame.playerId, 'loadComplete');
    expect(names(frame)).not.toContain('seek');
    // 次の動画には付けない
    engine.load('sm10');
    expect(frames.at(-1)!.src).not.toContain('from=');
  });

  it('読み込めたら、コメントを隠し、残しておいた音量と消音にしてから流す', () => {
    const { frame } = create('sm1', { volume: 40, muted: true });
    receive(frame.playerId, 'loadComplete');
    expect(frame.sent).toEqual([
      expect.objectContaining({
        eventName: 'commentVisibilityChange',
        data: { commentVisibility: false },
      }),
      expect.objectContaining({ eventName: 'volumeChange', data: { volume: 0.4 } }),
      expect.objectContaining({ eventName: 'mute', data: { mute: true } }),
      expect.objectContaining({ eventName: 'play' }),
    ]);
    expect(frame.sent.every((m) => m.playerId === frame.playerId)).toBe(true);
  });
});

describe('届いた知らせ', () => {
  it('再生中・一時停止・終わりを知らせる。読み込み中（1）は何もしない', () => {
    const { ev, frame } = create();
    receive(frame.playerId, 'statusChange', { playerStatus: 1 });
    receive(frame.playerId, 'statusChange', { playerStatus: 2 });
    receive(frame.playerId, 'playerMetadataChange', { currentTime: 500, duration: 240000 });
    for (const playerStatus of [3, 4]) receive(frame.playerId, 'statusChange', { playerStatus });
    expect(ev.onPlaying).toHaveBeenCalledTimes(1);
    expect(ev.onPaused).toHaveBeenCalledTimes(1);
    expect(ev.onEnded).toHaveBeenCalledTimes(1);
  });

  it('再生位置と長さはミリ秒で届くので、秒にして返す', () => {
    const { engine, frame } = create();
    expect(engine.time()).toEqual({ current: 0, duration: 0 });
    receive(frame.playerId, 'playerMetadataChange', { currentTime: 1500, duration: 240000 });
    expect(engine.time()).toEqual({ current: 1.5, duration: 240 });
  });

  it('再生を止められたら ▶ に戻す', () => {
    const { ev, frame } = create();
    receive(frame.playerId, 'player-error:video:play');
    expect(ev.onBlocked).toHaveBeenCalledTimes(1);
  });

  it('止められた知らせのあとに届く一時停止は、一時停止として知らせる（WebKit の届き方）', () => {
    const { ev, frame } = create();
    receive(frame.playerId, 'statusChange', { playerStatus: 2 });
    receive(frame.playerId, 'player-error:video:play');
    receive(frame.playerId, 'statusChange', { playerStatus: 3 });
    expect(ev.onBlocked).toHaveBeenCalledTimes(1);
    expect(ev.onPaused).toHaveBeenCalledTimes(1);
  });

  it('止められた知らせが無くても、音が進まないまま頼んでいない一時停止が届いたら、止められたとみなす（iPhone）', () => {
    const { ev, frame } = create();
    receive(frame.playerId, 'statusChange', { playerStatus: 2 });
    receive(frame.playerId, 'statusChange', { playerStatus: 3 });
    expect(ev.onBlocked).toHaveBeenCalledTimes(1);
    expect(ev.onPaused).not.toHaveBeenCalled();
  });

  it('こちらから頼んだ一時停止と、シークの最中の一時停止は、止められたとみなさない', () => {
    const { engine, ev, frame } = create();
    receive(frame.playerId, 'statusChange', { playerStatus: 3, seekStatus: 2 });
    engine.pause();
    receive(frame.playerId, 'statusChange', { playerStatus: 3 });
    expect(ev.onBlocked).not.toHaveBeenCalled();
    expect(ev.onPaused).toHaveBeenCalledTimes(2);
  });

  it('動画を替えたら、止められたかの見分けをやり直す', () => {
    const { engine, ev } = create();
    receive(frames.at(-1)!.playerId, 'statusChange', { playerStatus: 3 });
    engine.load('sm2');
    receive(frames.at(-1)!.playerId, 'statusChange', { playerStatus: 3 });
    expect(ev.onBlocked).toHaveBeenCalledTimes(2);
  });

  it('流せない動画は、Vocafy に知らせてから次へ進ませる', () => {
    const { ev, frame } = create('sm5');
    receive(frame.playerId, 'error');
    expect(ev.onError).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(JSON.parse(String(init.body))).toEqual({ service: 'niconico', videoId: 'sm5' });
  });

  it('ほかのサイトからの知らせと、ほかのプレイヤーの知らせは拾わない', () => {
    const { ev, frame } = create();
    receive(frame.playerId, 'statusChange', { playerStatus: 2 }, 'https://example.com');
    receive('vocafy-other', 'statusChange', { playerStatus: 2 });
    expect(ev.onPlaying).not.toHaveBeenCalled();
  });
});

describe('曲を替えたとき', () => {
  it('埋め込みごと作り直し、playerId を変える', () => {
    const { engine, frame } = create('sm1');
    engine.load('sm2');
    const next = frames.at(-1)!;
    expect(next).not.toBe(frame);
    expect(next.src).toContain('/watch/sm2');
    expect(next.playerId).not.toBe(frame.playerId);
  });

  it('前の動画の知らせは拾わない', () => {
    const { engine, ev, frame } = create('sm1');
    engine.load('sm2');
    receive(frame.playerId, 'statusChange', { playerStatus: 4 });
    expect(ev.onEnded).not.toHaveBeenCalled();
    receive(frames.at(-1)!.playerId, 'statusChange', { playerStatus: 4 });
    expect(ev.onEnded).toHaveBeenCalledTimes(1);
  });

  it('再生位置を 0 に戻し、流せなかったときは新しい動画の番号で知らせる', () => {
    const { engine, frame } = create('sm1');
    receive(frame.playerId, 'playerMetadataChange', { currentTime: 9000, duration: 10000 });
    engine.load('sm2');
    expect(engine.time()).toEqual({ current: 0, duration: 0 });
    receive(frames.at(-1)!.playerId, 'error');
    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(JSON.parse(String(init.body)).videoId).toBe('sm2');
  });
});

describe('操作', () => {
  it('シークはミリ秒で送り、返す位置もすぐ変える。音量は 0〜1 で送る', () => {
    const { engine, frame } = create();
    engine.seek(30);
    engine.setVolume(25);
    engine.setMuted(true);
    engine.pause();
    engine.play();
    expect(engine.time().current).toBe(30);
    expect(frame.sent.map((m) => [m.eventName, m.data])).toEqual([
      ['seek', { time: 30000 }],
      ['volumeChange', { volume: 0.25 }],
      ['mute', { mute: true }],
      ['pause', undefined],
      ['play', undefined],
    ]);
  });

  it('変えた音量は、次の曲の読み込みのときにも使う', () => {
    const { engine } = create('sm1', { volume: 40, muted: false });
    engine.setVolume(70);
    engine.load('sm2');
    const next = frames.at(-1)!;
    receive(next.playerId, 'loadComplete');
    expect(next.sent.find((m) => m.eventName === 'volumeChange')?.data).toEqual({ volume: 0.7 });
  });

  it('壊したら埋め込みを外し、そのあとの知らせは拾わない', () => {
    const { engine, ev, frame } = create();
    engine.destroy();
    receive(frame.playerId, 'statusChange', { playerStatus: 2 });
    expect(frame.removed).toBe(true);
    expect(ev.onPlaying).not.toHaveBeenCalled();
    expect(names(frame)).toEqual([]);
  });
});

describe('先に読み込んでおいた埋め込み', () => {
  it('作り直さずにそのまま使い、すぐ流し始める', () => {
    const iframe = new FakeIframe();
    iframe.src = `${ORIGIN}/watch/sm7?jsapi=1&playerId=pool-1`;
    const ev = events();
    const engine = createNiconicoEngine(container, 'sm7', { volume: 100, muted: false }, ev, {
      videoId: 'sm7',
      playerId: 'pool-1',
      iframe: iframe as unknown as HTMLIFrameElement,
      box: {} as HTMLElement,
    });
    destroyers.push(engine.destroy);
    expect(frames).toHaveLength(0);
    expect(names(iframe)).toEqual(['commentVisibilityChange', 'volumeChange', 'mute', 'play']);
    receive('pool-1', 'statusChange', { playerStatus: 2 });
    expect(ev.onPlaying).toHaveBeenCalledTimes(1);
  });
});
