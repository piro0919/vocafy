// @vitest-environment happy-dom
import { cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { type FrameMode, useFrameLayout } from '@/components/player/use-frame-layout';

// vitest の globals を使っていないので、描いた部品はテストごとに自分で片付ける（残すと受け口が重なる）
afterEach(cleanup);

/**
 * 動画の枠を置き場所（slot）と右下の窓（dock）に合わせる処理（use-frame-layout.ts）。happy-dom は大きさを測らないので、
 * 要素の getBoundingClientRect を差し替える。確かめるのは、置き場所への合わせ方・ヘッダーの下に潜った分の切り取り・
 * 形が変わるときの動き・一瞬だけの右下の窓の取り消し・html の印
 */

const rect = (top: number, left: number, width: number, height: number) =>
  ({
    top,
    left,
    width,
    height,
    right: left + width,
    bottom: top + height,
    x: left,
    y: top,
  }) as DOMRect;

let animations: { cancel: ReturnType<typeof vi.fn> }[];
let animate: ReturnType<typeof vi.fn>;
let frameBox: DOMRect;

beforeEach(() => {
  vi.useFakeTimers();
  animations = [];
  animate = vi.fn(() => {
    const a = { cancel: vi.fn() };
    animations.push(a);
    return a;
  });
  frameBox = rect(600, 900, 356, 200);
  vi.stubGlobal('matchMedia', () => ({ matches: false }));
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      disconnect() {}
    },
  );
  document.body.innerHTML = '';
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

function slotAt(box: DOMRect) {
  const slot = document.createElement('div');
  slot.getBoundingClientRect = () => box;
  document.body.append(slot);
  return slot;
}

function setup(initial: { mode: FrameMode; slot: HTMLElement | null }) {
  const frame = document.createElement('div');
  frame.getBoundingClientRect = () => frameBox;
  Object.assign(frame, { animate, getAnimations: () => animations });
  document.body.append(frame);
  return renderHook(
    ({ mode, slot }) => {
      const ref = useFrameLayout(mode, slot);
      // 返す参照に枠を付ける（ふだんは JSX の ref で付ける）
      (ref as { current: HTMLDivElement | null }).current = frame;
      return ref;
    },
    { initialProps: initial },
  );
}

describe('置き場所に合わせる', () => {
  it('置き場所の位置と大きさに、枠の位置と大きさを合わせる', () => {
    const slot = slotAt(rect(80, 20, 640, 360));
    const view = setup({ mode: 'dock', slot: null });
    view.rerender({ mode: 'slot', slot });
    const el = view.result.current.current!;
    expect([el.style.top, el.style.left, el.style.width, el.style.height]).toEqual([
      '80px',
      '20px',
      '640px',
      '360px',
    ]);
  });

  it('ヘッダーの下に潜った分は、上側を切り取って見せない', () => {
    const header = document.createElement('header');
    header.getBoundingClientRect = () => rect(0, 0, 1000, 60);
    document.body.append(header);
    const slot = slotAt(rect(20, 0, 640, 360));
    const view = setup({ mode: 'dock', slot: null });
    view.rerender({ mode: 'slot', slot });
    expect(view.result.current.current!.style.clipPath).toBe('inset(40px 0 0 0)');
  });

  it('ページから外れた置き場所や、大きさ0の置き場所には合わせない', () => {
    const detached = document.createElement('div');
    detached.getBoundingClientRect = () => rect(80, 20, 640, 360);
    const view = setup({ mode: 'dock', slot: null });
    view.rerender({ mode: 'slot', slot: detached });
    expect(view.result.current.current!.style.top).toBe('');
    view.rerender({ mode: 'slot', slot: slotAt(rect(0, 0, 0, 0)) });
    expect(view.result.current.current!.style.top).toBe('');
  });

  it('右下の窓に戻ったら、合わせた位置と大きさを外す', () => {
    const slot = slotAt(rect(80, 20, 640, 360));
    const view = setup({ mode: 'slot', slot });
    view.rerender({ mode: 'dock', slot: null });
    const el = view.result.current.current!;
    expect([el.style.top, el.style.width, el.style.clipPath]).toEqual(['', '', '']);
  });
});

describe('形が変わるときの動き', () => {
  it('右下の窓から置き場所へ移るときは、元の位置と大きさから滑らかに移す', () => {
    const view = setup({ mode: 'dock', slot: null });
    vi.advanceTimersByTime(1000);
    frameBox = rect(80, 20, 640, 360);
    view.rerender({ mode: 'slot', slot: slotAt(frameBox) });
    expect(animate).toHaveBeenCalledTimes(1);
    const [keyframes] = animate.mock.calls[0] as [{ transform: string }[]];
    expect(keyframes[0].transform).toBe(
      'translate(880px, 520px) scale(0.55625, 0.5555555555555556)',
    );
  });

  it('何も流していなかったところから置き場所に出るときは、その場でふわっと出す', () => {
    const view = setup({ mode: 'none', slot: null });
    view.rerender({ mode: 'slot', slot: slotAt(rect(80, 20, 640, 360)) });
    const [keyframes] = animate.mock.calls[0] as [{ opacity: number }[]];
    expect(keyframes).toEqual([{ opacity: 0 }, { opacity: 1 }]);
  });

  it('一瞬だけ右下の窓の形になってすぐ置き場所に戻ったら、始めかけた動きを取り消し、移る動きも付けない', () => {
    const slot = slotAt(rect(80, 20, 640, 360));
    const view = setup({ mode: 'slot', slot });
    vi.advanceTimersByTime(1000);
    view.rerender({ mode: 'dock', slot: null });
    const started = animations.length;
    expect(started).toBe(1);
    vi.advanceTimersByTime(50);
    view.rerender({ mode: 'slot', slot });
    expect(animations[0].cancel).toHaveBeenCalled();
    expect(animations).toHaveLength(started);
  });

  it('動きを減らす設定の人には、動きを付けない', () => {
    vi.stubGlobal('matchMedia', () => ({ matches: true }));
    const view = setup({ mode: 'dock', slot: null });
    vi.advanceTimersByTime(1000);
    view.rerender({ mode: 'slot', slot: slotAt(rect(80, 20, 640, 360)) });
    expect(animate).not.toHaveBeenCalled();
  });
});

describe('html の印', () => {
  it('いまの形を data-player に付ける（本文の下の余白を変えるため）', () => {
    const view = setup({ mode: 'none', slot: null });
    expect(document.documentElement.dataset.player).toBe('none');
    view.rerender({ mode: 'dock', slot: null });
    expect(document.documentElement.dataset.player).toBe('dock');
  });
});
