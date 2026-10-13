import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * iPad・iPhone で、見えているニコニコの曲の埋め込みを先に読み込んでおく入れ物（niconico-pool.ts）。
 * 偽の document と message の知らせで、読み込み・数え方・受け取り・捨て方を確かめる
 */

const ORIGIN = 'https://embed.nicovideo.jp';

type Node = {
  tag: string;
  src?: string;
  hidden?: boolean;
  className?: string;
  children: Node[];
  removed: boolean;
  append: (child: Node) => void;
  remove: () => void;
};
const node = (tag: string): Node => {
  const n: Node = {
    tag,
    children: [],
    removed: false,
    append: (child) => n.children.push(child),
    remove: () => {
      n.removed = true;
    },
  };
  return n;
};

const win = new EventTarget();
vi.stubGlobal('window', win);
vi.stubGlobal('location', { pathname: '/' });
vi.stubGlobal('document', { createElement: node });

const { createNiconicoPool } = await import('@/components/player/niconico-pool');

let container: Node;
let playing: string | undefined;
let pool: ReturnType<typeof createNiconicoPool>;

const boxes = () => container.children;
const playerIdOf = (box: Node) => new URL(box.children[0].src ?? '').searchParams.get('playerId');
function loaded(playerId: string | null, origin = ORIGIN) {
  const e = new Event('message') as Event & { origin: string; data: unknown };
  Object.assign(e, { origin, data: { eventName: 'loadComplete', playerId } });
  win.dispatchEvent(e);
}

beforeEach(() => {
  pool?.destroy();
  container = node('div');
  playing = undefined;
  pool = createNiconicoPool(
    () => container as unknown as HTMLElement,
    () => playing,
  );
});

describe('want（行が見えた）', () => {
  it('隠した入れ物に、動画の埋め込みを読み込み始める', () => {
    pool.want('sm1');
    expect(boxes()).toHaveLength(1);
    const [box] = boxes();
    expect(box.hidden).toBe(true);
    expect(box.children[0].src).toContain('/watch/sm1?jsapi=1&playerId=vocafy-pre-');
  });

  it('流し始める位置があれば、住所の from に秒で付ける（開き直して戻した曲の続き）', () => {
    const withStart = createNiconicoPool(
      () => container as unknown as HTMLElement,
      () => undefined,
      (id) => (id === 'sm1' ? 122.7 : undefined),
    );
    withStart.want('sm1');
    withStart.want('sm2');
    const [a, b] = boxes();
    expect(a.children[0].src).toContain('&from=122');
    expect(b.children[0].src).not.toContain('from=');
    withStart.destroy();
  });

  it('同じ曲の行が2つ見えても、埋め込みは1つ', () => {
    pool.want('sm1');
    pool.want('sm1');
    expect(boxes()).toHaveLength(1);
  });

  it('いま流している曲は読み込まない', () => {
    playing = 'sm1';
    pool.want('sm1');
    expect(boxes()).toHaveLength(0);
  });

  it('枠がまだ無ければ何もしない', () => {
    const empty = createNiconicoPool(
      () => null,
      () => undefined,
    );
    expect(() => empty.want('sm1')()).not.toThrow();
    empty.destroy();
  });

  it('見ている行がすべて見えなくなったら捨てる', () => {
    const a = pool.want('sm1');
    const b = pool.want('sm1');
    a();
    expect(boxes()[0].removed).toBe(false);
    b();
    expect(boxes()[0].removed).toBe(true);
    // 捨てたあとにもう一度見えたら、読み込み直す
    pool.want('sm1');
    expect(boxes()).toHaveLength(2);
  });

  it('見えなくなる知らせが余分に届いても、数は 0 より下がらない', () => {
    const a = pool.want('sm1');
    a();
    a();
    pool.want('sm1');
    const c = pool.want('sm1');
    c();
    expect(boxes()[1].removed).toBe(false);
  });
});

describe('take（押されたので受け取る）', () => {
  it('読み込みが終わる前は受け取れない', () => {
    pool.want('sm1');
    expect(pool.take('sm1')).toBeNull();
    expect(pool.take('sm9')).toBeNull();
  });

  it('読み込みが終わったら受け取れ、受け取ったら入れ物は抱えるのをやめる', () => {
    pool.want('sm1');
    const id = playerIdOf(boxes()[0]);
    loaded(id);
    const taken = pool.take('sm1');
    expect(taken?.playerId).toBe(id);
    expect(taken?.videoId).toBe('sm1');
    expect(pool.take('sm1')).toBeNull();
  });

  it('ほかのサイトの知らせ・ほかの埋め込みの知らせでは、読み込み済みにしない', () => {
    pool.want('sm1');
    const id = playerIdOf(boxes()[0]);
    loaded(id, 'https://example.com');
    loaded('vocafy-pre-other');
    expect(pool.take('sm1')).toBeNull();
  });

  it('受け取ったあとに行が見えなくなっても、流している埋め込みは捨てない', () => {
    const release = pool.want('sm1');
    loaded(playerIdOf(boxes()[0]));
    pool.take('sm1');
    release();
    expect(boxes()[0].removed).toBe(false);
  });
});

describe('refresh（流す曲が替わった）', () => {
  it('受け取られた曲の行がまだ見えていれば、読み込み直す', () => {
    pool.want('sm1');
    loaded(playerIdOf(boxes()[0]));
    playing = 'sm1';
    pool.take('sm1');
    // 流しているあいだは読み込まない
    pool.refresh();
    expect(boxes()).toHaveLength(1);
    // 別の曲に替わったら、見えている sm1 を読み込み直し、次に押されたときに受け取れる
    playing = 'sm2';
    pool.refresh();
    expect(boxes()).toHaveLength(2);
    loaded(playerIdOf(boxes()[1]));
    expect(pool.take('sm1')?.playerId).toBe(playerIdOf(boxes()[1]));
  });

  it('見えなくなった曲・抱えている曲は読み込まない', () => {
    const release = pool.want('sm1');
    pool.want('sm2');
    release();
    pool.refresh();
    expect(boxes()).toHaveLength(2);
    expect(boxes().filter((b) => !b.removed)).toHaveLength(1);
  });
});

describe('destroy', () => {
  it('抱えている埋め込みをすべて捨て、そのあとの知らせは拾わない', () => {
    pool.want('sm1');
    pool.want('sm2');
    const id = playerIdOf(boxes()[0]);
    pool.destroy();
    expect(boxes().every((b) => b.removed)).toBe(true);
    loaded(id);
    expect(pool.take('sm1')).toBeNull();
  });
});
