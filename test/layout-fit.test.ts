// @vitest-environment happy-dom
import { render } from '@testing-library/react';
import { type ComponentType, createElement, type ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * 大きさを測って決める処理（共有の板の位置合わせ・流れる曲名）。happy-dom は大きさを測らないので、測る値を差し替える
 */

vi.mock('@/components/display-names', () => ({
  useProducerName: () => (_id: number, name: string) => name,
  useSongTitle: () => (s: { title: string }) => ({ main: s.title }),
}));
vi.mock('@/i18n/navigation', () => ({
  useLocalize: () => (path: string) => path,
  useText: (text: Record<string, unknown>) => text.ja,
}));

const { fitMenu } = await import('@/components/share-menu');
const { Marquee } = await import('@/components/marquee');
/** 子を3つ目の引数で渡すための型（children を props に書くと lint が止める） */
const MarqueeOf = Marquee as ComponentType<{ active?: boolean; children?: ReactNode }>;

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

let reduced: boolean;
beforeEach(() => {
  reduced = false;
  vi.stubGlobal('matchMedia', () => ({ matches: reduced }));
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      disconnect() {}
    },
  );
  document.body.innerHTML = '';
  document.documentElement.style.setProperty('--toast-bottom', '100px');
  Object.defineProperty(window, 'innerHeight', { value: 800, configurable: true });
  Object.defineProperty(window, 'innerWidth', { value: 1200, configurable: true });
});
afterEach(() => vi.unstubAllGlobals());

describe('fitMenu（共有の板を画面の中に収める）', () => {
  function menu(box: DOMRect) {
    const el = document.createElement('div');
    el.style.marginLeft = '8px';
    el.getBoundingClientRect = () => box;
    document.body.append(el);
    return el;
  }
  function video(bottom: number) {
    const v = document.createElement('div');
    v.dataset.stageVideo = '';
    v.getBoundingClientRect = () => rect(0, 0, 640, bottom);
    document.body.append(v);
  }

  it('再生の帯にかからなければ、動かさない', () => {
    const el = menu(rect(300, 100, 240, 300));
    fitMenu(el, null);
    expect(el.style.translate).toBe('0px 0');
  });

  it('再生の帯にかかる分だけ上へずらす', () => {
    video(200);
    const el = menu(rect(500, 100, 240, 300));
    fitMenu(el, null);
    // 帯の上の線は 800 - 100 = 700。下の端 800 が 100 はみ出す
    expect(el.style.translate).toBe('0px -100px');
  });

  it('ずらすのは動画の下の端まで。それでも入らない分は QR を縮める', () => {
    video(400);
    const el = menu(rect(450, 100, 240, 400));
    const qr = document.createElement('div');
    qr.getBoundingClientRect = () => rect(0, 0, 200, 200);
    fitMenu(el, qr);
    // はみ出すのは 150。上へは 450 - (400 + 8) = 42 だけ。残り 108 を QR から削る
    expect(el.style.translate).toBe('0px -42px');
    expect(qr.style.width).toBe('92px');
  });

  it('画面の右の端からはみ出すときは、左へ寄せる', () => {
    const el = menu(rect(300, 1100, 240, 300));
    fitMenu(el, null);
    expect(el.style.translate).toBe('-148px 0');
  });
});

describe('Marquee（収まらない曲名を流す）', () => {
  let animate: ReturnType<typeof vi.fn>;

  function show(textWidth: number, boxWidth: number, active = true) {
    animate = vi.fn(() => ({ cancel: vi.fn() }));
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (
      this: HTMLElement,
    ) {
      // 写し（pl-12）は、元の文字の右に 48px 空けて並ぶ
      if (this.classList.contains('pl-12')) return rect(0, textWidth, textWidth + 48, 20);
      return rect(0, 0, textWidth, 20);
    });
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(boxWidth);
    // happy-dom は Tailwind の pl-12 を知らないので、写しの前の間（48px）を返す
    const computed = window.getComputedStyle;
    vi.spyOn(window, 'getComputedStyle').mockImplementation((el) =>
      el instanceof HTMLElement && el.classList.contains('pl-12')
        ? ({ paddingLeft: '48px' } as CSSStyleDeclaration)
        : computed(el),
    );
    Object.assign(HTMLElement.prototype, { animate });
    return render(createElement(MarqueeOf, { active }, 'とても長い曲名'));
  }
  afterEach(() => vi.restoreAllMocks());

  it('収まる曲名は流さず、末尾を … で切る', () => {
    const { container } = show(100, 200);
    expect(container.querySelector('[aria-hidden]')).toBeNull();
    expect(container.querySelector('.truncate')).not.toBeNull();
    expect(animate).not.toHaveBeenCalled();
  });

  it('収まらない曲名は、写しを並べて、写しの頭が元の頭の位置に来るまで流し続ける', () => {
    const { container } = show(300, 200);
    expect(container.querySelector('[aria-hidden]')?.textContent).toBe('とても長い曲名');
    expect(animate).toHaveBeenCalledTimes(1);
    const [keyframes, options] = animate.mock.calls[0] as [
      { transform: string }[],
      { iterations: number },
    ];
    // 元の文字の幅 300 と、写しの前の間 48 の分だけ流す
    expect(keyframes.at(-1)?.transform).toBe('translateX(-348px)');
    expect(options.iterations).toBe(Infinity);
  });

  it('動きを減らす設定の人と、流さないとき（active が false）は流さない', () => {
    reduced = true;
    expect(show(300, 200).container.querySelector('[aria-hidden]')).toBeNull();
    reduced = false;
    expect(show(300, 200, false).container.querySelector('[aria-hidden]')).toBeNull();
  });
});
