import { beforeEach, describe, expect, it, vi } from 'vitest';

const sentry = {
  captureMessage: vi.fn((_message: string, context: { tags: Record<string, unknown> }) =>
    sentry.tags.push(context.tags),
  ),
  addBreadcrumb: vi.fn(),
  init: vi.fn(),
  tags: [] as Record<string, unknown>[],
};
vi.stubGlobal('window', { Sentry: sentry });
vi.mock('@/lib/apple-device', () => ({ isAppleDevice: () => false }));

const { createTapWatch } = await import('@/components/player/watch');

const SECOND = 1000;

function setup() {
  let t = 0;
  const watch = createTapWatch(() => t);
  return { watch, after: (ms: number) => (t += ms) };
}

const kinds = () => sentry.tags.map((t) => t.playback);

beforeEach(() => {
  sentry.captureMessage.mockClear();
  sentry.addBreadcrumb.mockClear();
  sentry.tags.length = 0;
});

describe('押し直し', () => {
  it('鳴る前に同じ曲を押し直したら、1回だけ知らせる', () => {
    const { watch, after } = setup();
    watch.requested('youtube', 'a', false);
    after(3 * SECOND);
    watch.requested('youtube', 'a', false);
    watch.requested('youtube', 'a', false);
    expect(kinds()).toEqual(['retap']);
  });

  it('帯の ▶ で押し直したときも知らせる', () => {
    const { watch, after } = setup();
    watch.requested('niconico', 'sm1', false);
    after(3 * SECOND);
    watch.retried();
    expect(kinds()).toEqual(['retap']);
  });

  it('鳴ったあとに押し直したのは知らせない（一時停止してから流し直すなど）', () => {
    const { watch, after } = setup();
    watch.requested('youtube', 'a', false);
    watch.sounded();
    after(3 * SECOND);
    watch.retried();
    watch.requested('youtube', 'a', false);
    expect(kinds()).toEqual([]);
  });

  it('別の曲に替えた・しばらくたってから押したのは知らせない', () => {
    const { watch, after } = setup();
    watch.requested('youtube', 'a', false);
    watch.requested('youtube', 'b', false);
    after(60 * SECOND);
    watch.requested('youtube', 'b', false);
    expect(kinds()).toEqual([]);
  });

  it('素早い二度押しは、鳴らないと感じた押し直しに数えない', () => {
    const { watch, after } = setup();
    watch.requested('youtube', 'a', false);
    after(150);
    watch.requested('youtube', 'a', false);
    expect(kinds()).toEqual([]);
  });

  it('自動で進んだ曲は見張らない', () => {
    const { watch } = setup();
    watch.requested('youtube', 'a', true);
    watch.retried();
    expect(kinds()).toEqual([]);
  });
});

describe('プレイヤーの知らせ', () => {
  it('自分で押した曲が止められたら知らせ、そのあとの ▶ は押し直しに数えない', () => {
    const { watch } = setup();
    watch.requested('niconico', 'sm1', false);
    watch.blocked('niconico', 'sm1', false);
    watch.retried();
    expect(kinds()).toEqual(['blocked']);
  });

  it('自動で進んだ先の曲が止められたのは知らせない', () => {
    const { watch } = setup();
    watch.blocked('niconico', 'sm1', true);
    expect(kinds()).toEqual([]);
  });

  it('動画そのものが流せないときは知らせず、ほかの失敗は知らせる', () => {
    const { watch } = setup();
    watch.failed('youtube', 'a', '100', true);
    watch.failed('niconico', 'sm1', 'watch_api_error', false);
    expect(kinds()).toEqual(['error']);
  });

  it('知らせには、直前のプレイヤーの動きが記録として付く', () => {
    const { watch } = setup();
    watch.requested('youtube', 'a', false);
    watch.retried();
    expect(sentry.addBreadcrumb).toHaveBeenCalledWith(
      expect.objectContaining({ category: 'player', message: 'load' }),
    );
  });
});
