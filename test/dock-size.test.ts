import { beforeEach, describe, expect, it, vi } from 'vitest';
import { IMAGE_SIZES } from '@/lib/image-sizes';

/**
 * パソコンの右下の窓の大きさ（dock-size.ts）。引き手を引いたときの幅の計算・上限と下限・残し方を、偽の画面で確かめる。
 * node には document も window も無いので、使う分だけを作る。globals.css の長さを測る箱（measure）は、どれも 0px を返す
 */

const MIN = IMAGE_SIZES.dockWide;
const RATIO = 16 / 9;

const store = new Map<string, string>();
const style = new Map<string, string>();
const html = {
  dataset: {} as Record<string, string>,
  style: {
    setProperty: (name: string, value: string) => style.set(name, value),
    removeProperty: (name: string) => style.delete(name),
  },
};
const win = { innerWidth: 2000, innerHeight: 1200, matchMedia: () => ({ matches: true }) };
let frameWidth = MIN;

vi.stubGlobal('window', win);
vi.stubGlobal('localStorage', {
  getItem: (key: string) => store.get(key) ?? null,
  setItem: (key: string, value: string) => store.set(key, value),
  removeItem: (key: string) => store.delete(key),
});
vi.stubGlobal('document', {
  documentElement: html,
  body: { append: () => {} },
  createElement: () => ({ style: {}, offsetHeight: 0, remove: () => {} }),
  querySelector: () => ({ style: {}, getBoundingClientRect: () => ({ width: frameWidth }) }),
});

const { resetDockSize, startDockResize } = await import('@/components/player/dock-size');

/** 引き手を (0, 0) で押し、(x, y) まで動かして離す */
function drag(x: number, y: number) {
  const listeners = new Map<string, (e: { clientX: number; clientY: number }) => void>();
  const handle = {
    setPointerCapture: () => {},
    addEventListener: (type: string, fn: (e: { clientX: number; clientY: number }) => void) =>
      listeners.set(type, fn),
    removeEventListener: (type: string) => listeners.delete(type),
  };
  startDockResize({
    button: 0,
    clientX: 0,
    clientY: 0,
    pointerId: 1,
    currentTarget: handle,
    preventDefault: () => {},
    stopPropagation: () => {},
  } as unknown as Parameters<typeof startDockResize>[0]);
  listeners.get('pointermove')?.({ clientX: x, clientY: y });
  const up = listeners.get('pointerup');
  up?.({ clientX: x, clientY: y });
  return { listening: listeners.size };
}
const width = () => Number.parseFloat(style.get('--spacing-dock-wide') ?? 'NaN');

beforeEach(() => {
  store.clear();
  style.clear();
  html.dataset = {};
  win.innerWidth = 2000;
  win.innerHeight = 1200;
  frameWidth = MIN;
});

describe('引き手を引いたとき', () => {
  it('右に寄せた窓は、左へ引くと引いた分だけ大きくなり、高さは 16:9 で追う', () => {
    drag(-100, 0);
    expect(width()).toBe(MIN + 100);
    expect(Number.parseFloat(style.get('--spacing-dock') ?? '')).toBeCloseTo((MIN + 100) / RATIO);
  });

  it('左に寄せた窓は、右へ引くと大きくなる', () => {
    html.dataset.dock = 'left';
    drag(100, 0);
    expect(width()).toBe(MIN + 100);
  });

  it('小さくするのは、内側と下の両方へ引いたとき（横か縦の片方だけでは、大きい方の 0 に合って縮まない）', () => {
    frameWidth = MIN + 200;
    drag(100, 0);
    expect(width()).toBe(MIN + 200);
    drag(100, 100 / RATIO);
    expect(width()).toBeCloseTo(MIN + 100);
  });

  it('上へ引いた量は 16:9 の幅に直し、横と縦の大きい方に合わせる', () => {
    drag(-10, -90);
    expect(width()).toBeCloseTo(MIN + 90 * RATIO);
  });

  it('上限は画面の幅の 75% と、窓が上の段の下に収まる高さの小さい方', () => {
    drag(-5000, 0);
    expect(width()).toBe(2000 * 0.75);
    style.clear();
    win.innerHeight = 600;
    drag(-5000, 0);
    expect(width()).toBeCloseTo(600 * RATIO);
  });

  it('下限（YouTube の規約の大きさ）より小さくはならず、下限なら元の大きさに戻す', () => {
    frameWidth = MIN + 50;
    drag(200, 200);
    expect(style.has('--spacing-dock-wide')).toBe(false);
    expect(store.has('vocafy-dock-width')).toBe(false);
  });

  it('離したら幅を整数で残し、受け口を外す', () => {
    const { listening } = drag(-80.6, 0);
    expect(store.get('vocafy-dock-width')).toBe(String(Math.round(MIN + 80.6)));
    expect(listening).toBe(0);
  });

  it('左のボタン以外では引かない', () => {
    startDockResize({ button: 2 } as unknown as Parameters<typeof startDockResize>[0]);
    expect(style.size).toBe(0);
  });
});

describe('元の大きさに戻す', () => {
  it('残した幅を消し、html に書いた大きさを外す', () => {
    drag(-100, 0);
    resetDockSize();
    expect(store.has('vocafy-dock-width')).toBe(false);
    expect(style.size).toBe(0);
  });
});
