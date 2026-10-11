// @vitest-environment happy-dom
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * 長い一覧の見えている行だけを描く仕組み（use-window-list.ts）。TanStack Virtual そのものは差し替え、
 * こちらで足した3つ（一覧の上端の位置を測る・付けたときの勝手なスクロールを通さない・開いたときに目当ての行へ移る）を確かめる
 */

const tanstack = vi.hoisted(() => ({
  options: null as null | Record<string, unknown>,
  scrollToIndex: vi.fn(),
  windowScroll: vi.fn(),
}));
vi.mock('@tanstack/react-virtual', () => ({
  useWindowVirtualizer: (options: Record<string, unknown>) => {
    tanstack.options = options;
    return { scrollToIndex: tanstack.scrollToIndex };
  },
  windowScroll: tanstack.windowScroll,
}));

const { useWindowList } = await import('@/components/use-window-list');

// vitest の globals を使っていないので、描いた部品はテストごとに自分で片付ける（残すと受け口が重なる）
afterEach(cleanup);

let observed: (() => void) | null;
beforeEach(() => {
  tanstack.options = null;
  tanstack.scrollToIndex.mockReset();
  tanstack.windowScroll.mockReset();
  observed = null;
  vi.stubGlobal(
    'ResizeObserver',
    class {
      constructor(callback: () => void) {
        observed = callback;
      }
      observe() {}
      disconnect() {}
    },
  );
});
afterEach(() => vi.unstubAllGlobals());

/** 一覧を包む要素を、ページの頭から top の位置に置いて描く */
function setup(jumpRow: number, top = 300) {
  const list = document.createElement('div');
  let at = top;
  list.getBoundingClientRect = () => ({ top: at - window.scrollY }) as DOMRect;
  const view = renderHook(
    ({ jump }) => {
      const r = useWindowList({ rows: 1000, estimate: 64, overscan: 5, jumpRow: jump });
      (r.list as { current: HTMLDivElement | null }).current = list;
      return r;
    },
    { initialProps: { jump: jumpRow } },
  );
  view.rerender({ jump: jumpRow });
  return { ...view, move: (next: number) => (at = next) };
}

describe('useWindowList', () => {
  it('一覧の上端の、ページの頭からの位置を測り、ページの高さが変わったら測り直す', () => {
    const { result, move } = setup(0, 300);
    expect(result.current.margin).toBe(300);
    move(420);
    act(() => observed?.());
    expect(result.current.margin).toBe(420);
    expect(tanstack.options?.scrollMargin).toBe(420);
  });

  it('付けたときに覚えている位置へ戻すスクロール（behavior の無いもの）は通さず、行へ移るスクロールは通す', () => {
    setup(0);
    const scrollToFn = tanstack.options?.scrollToFn as (
      offset: number,
      options: { behavior?: string },
      instance: unknown,
    ) => void;
    scrollToFn(500, {}, null);
    expect(tanstack.windowScroll).not.toHaveBeenCalled();
    scrollToFn(500, { behavior: 'auto' }, null);
    expect(tanstack.windowScroll).toHaveBeenCalledTimes(1);
  });

  it('住所のページ番号から開いたときは、一度だけその行を先頭までスクロールする', () => {
    const { rerender } = setup(300);
    expect(tanstack.scrollToIndex).toHaveBeenCalledWith(300, { align: 'start' });
    rerender({ jump: 300 });
    expect(tanstack.scrollToIndex).toHaveBeenCalledTimes(1);
  });

  it('1ページ目（jumpRow が 0）では移らない', () => {
    setup(0);
    expect(tanstack.scrollToIndex).not.toHaveBeenCalled();
  });

  it('サーバーで描くときも、上から画面1枚分ほどの行は描く', () => {
    setup(0);
    expect(tanstack.options?.initialRect).toEqual({ width: 0, height: 1200 });
  });
});
