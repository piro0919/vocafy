// @vitest-environment happy-dom
import { act, cleanup, render } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// vitest の globals を使っていないので、描いた部品はテストごとに自分で片付ける（残すと受け口が重なる）
afterEach(cleanup);

/**
 * 画面の端からのスワイプで戻る・進む（swipe-back.tsx）。iPhone のホーム画面から開いたとみなし、指の動きの知らせを送って確かめる
 */

const router = vi.hoisted(() => ({ back: vi.fn(), forward: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => router }));
vi.mock('@/lib/standalone', () => ({ isIosStandalone: () => true }));

const { SwipeBack } = await import('@/components/swipe-back/swipe-back');
const { setRightEdge, setSwipeBack } = await import('@/components/swipe-back/swipe-back-store');

const WIDTH = 400;

/** 指の知らせ。happy-dom の TouchEvent は touches を受けないので、Event に足す */
function touch(type: string, target: EventTarget, points: { x: number; y: number }[]) {
  const e = new Event(type, { bubbles: true, cancelable: true });
  Object.defineProperty(e, 'touches', {
    value: points.map((p) => ({ clientX: p.x, clientY: p.y })),
  });
  act(() => {
    target.dispatchEvent(e);
  });
  return e;
}

/** from から to まで指を動かして離す */
function swipe(
  from: { x: number; y: number },
  to: { x: number; y: number },
  target: Element = document.body,
) {
  touch('touchstart', target, [from]);
  const mid = { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 };
  touch('touchmove', target, [mid]);
  const last = touch('touchmove', target, [to]);
  touch('touchend', target, []);
  return last;
}

beforeEach(() => {
  localStorage.clear();
  document.body.innerHTML = '';
  router.back.mockReset();
  router.forward.mockReset();
  Object.defineProperty(window, 'innerWidth', { value: WIDTH, configurable: true });
  setSwipeBack(true);
  setRightEdge('back');
});

describe('SwipeBack', () => {
  it('左端から右へ引ききって離すと戻る。引いているあいだは画面を横に動かさない', () => {
    render(createElement(SwipeBack));
    const move = swipe({ x: 5, y: 300 }, { x: 120, y: 305 });
    expect(router.back).toHaveBeenCalledTimes(1);
    expect(move.defaultPrevented).toBe(true);
  });

  it('引ききらずに離したら何もしない', () => {
    render(createElement(SwipeBack));
    swipe({ x: 5, y: 300 }, { x: 60, y: 300 });
    expect(router.back).not.toHaveBeenCalled();
  });

  it('端から始めなかったとき・縦に動かしたとき（スクロール）は何もしない', () => {
    render(createElement(SwipeBack));
    swipe({ x: 100, y: 300 }, { x: 250, y: 300 });
    swipe({ x: 5, y: 300 }, { x: 40, y: 500 });
    expect(router.back).not.toHaveBeenCalled();
  });

  it('右端から左へ引くと、設定に従って戻るか進む', () => {
    render(createElement(SwipeBack));
    swipe({ x: WIDTH - 5, y: 300 }, { x: WIDTH - 120, y: 300 });
    expect(router.back).toHaveBeenCalledTimes(1);
    act(() => setRightEdge('forward'));
    swipe({ x: WIDTH - 5, y: 300 }, { x: WIDTH - 120, y: 300 });
    expect(router.forward).toHaveBeenCalledTimes(1);
  });

  it('横に流れる棚の上と、右下の窓の帯の上で始めたときは何もしない', () => {
    render(createElement(SwipeBack));
    const shelf = document.createElement('div');
    shelf.style.overflowX = 'auto';
    Object.defineProperty(shelf, 'scrollWidth', { value: 1000 });
    Object.defineProperty(shelf, 'clientWidth', { value: 400 });
    const strip = document.createElement('div');
    strip.dataset.dockStrip = '';
    document.body.append(shelf, strip);
    swipe({ x: 5, y: 300 }, { x: 120, y: 300 }, shelf);
    swipe({ x: 5, y: 300 }, { x: 120, y: 300 }, strip);
    expect(router.back).not.toHaveBeenCalled();
  });

  it('途中でページがもう動いたら（popstate）、離しても二重に戻らない', () => {
    render(createElement(SwipeBack));
    touch('touchstart', document.body, [{ x: 5, y: 300 }]);
    touch('touchmove', document.body, [{ x: 120, y: 300 }]);
    act(() => {
      window.dispatchEvent(new Event('popstate'));
    });
    touch('touchend', document.body, []);
    expect(router.back).not.toHaveBeenCalled();
  });

  it('設定で切っていれば、何も出さず何もしない', () => {
    setSwipeBack(false);
    const { container } = render(createElement(SwipeBack));
    swipe({ x: 5, y: 300 }, { x: 120, y: 300 });
    expect(container.firstChild).toBeNull();
    expect(router.back).not.toHaveBeenCalled();
  });
});
