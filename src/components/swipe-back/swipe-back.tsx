'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { Icon } from '../icon';
import {
  isIosStandalone,
  type RightEdge,
  rightEdge,
  subscribeSwipeBack,
  swipeBackEnabled,
} from './swipe-back-store';

/** 端のこの幅から始めたときだけ受ける */
const EDGE = 24;
/** ここまで引いて離すと動く */
const THRESHOLD = 80;
/** 丸が指について出てくる上限 */
const MAX = 110;
/** 丸の大きさ（size-12）と、隠れているときに端の外へ出しておく分 */
const HIDDEN = 56;

type Side = 'left' | 'right';

/**
 * 指を置いたところが、横にスクロールできる場所（横に流れる棚）の中か。
 * そこでは端から始めても棚を送る動きなので、戻る・進むは始めない
 */
function inHorizontalScroller(target: EventTarget | null): boolean {
  for (let el = target instanceof Element ? target : null; el !== null; el = el.parentElement) {
    if (el.scrollWidth > el.clientWidth + 1) {
      const overflow = getComputedStyle(el).overflowX;
      if (overflow === 'auto' || overflow === 'scroll') return true;
    }
  }
  return false;
}

/**
 * 画面の端からのスワイプで、前のページへ戻る。koidamashii の swipe-back.tsx を写した（2026-10-07）。
 * 設定で ON にした、iPhone・iPad のホーム画面から開いたときだけ動く（swipe-back-store.ts）。
 * 左端から右へ引くと戻る。右端から左へ引くと、設定に従って戻るか進む。指に合わせて丸が出てきて、
 * 引ききると色が変わり、離すと動く。縦のスクロールと分かったら何もしない。横に流れる棚の上で始めたときも何もしない。
 * システムがスワイプを引き取ったとき（touchcancel）と、途中ですでにページが動いたとき（popstate）は止め、二重に動かない
 */
export function SwipeBack() {
  const router = useRouter();
  const enabled = useSyncExternalStore(
    subscribeSwipeBack,
    () => swipeBackEnabled() && isIosStandalone(),
    () => false,
  );
  const right = useSyncExternalStore(subscribeSwipeBack, rightEdge, (): RightEdge => 'back');
  const dot = useRef<HTMLDivElement>(null);
  // 丸をどちらの端に出すか。引き始めに決まる
  const [side, setSide] = useState<Side>('left');

  useEffect(() => {
    if (!enabled) return;
    let start: { x: number; y: number; side: Side } | undefined;
    let pulling = false;
    let popped = false;
    let pull = 0;

    const place = (el: HTMLDivElement, from: Side, offset: number) => {
      el.style.left = from === 'left' ? '0px' : '';
      el.style.right = from === 'right' ? '0px' : '';
      el.style.transform = `translateX(${from === 'left' ? offset : -offset}px)`;
    };
    const show = (from: Side, distance: number, y: number, armed: boolean) => {
      const el = dot.current;
      if (el === null) return;
      el.style.transition = 'none';
      el.style.top = `${y - 24}px`;
      place(el, from, Math.min(distance, MAX) - HIDDEN);
      el.style.opacity = String(Math.min(distance / THRESHOLD, 1));
      el.dataset.armed = String(armed);
    };
    const hide = (from: Side) => {
      const el = dot.current;
      if (el === null) return;
      el.style.transition = '';
      place(el, from, -HIDDEN);
      el.style.opacity = '0';
      el.dataset.armed = 'false';
    };
    const reset = () => {
      if (start !== undefined) hide(start.side);
      start = undefined;
      pulling = false;
      pull = 0;
    };

    const onStart = (e: TouchEvent) => {
      const t = e.touches[0];
      if (e.touches.length !== 1 || t === undefined) return;
      const from: Side | undefined =
        t.clientX <= EDGE ? 'left' : t.clientX >= window.innerWidth - EDGE ? 'right' : undefined;
      if (from === undefined || inHorizontalScroller(e.target)) return;
      start = { x: t.clientX, y: t.clientY, side: from };
      setSide(from);
      popped = false;
    };
    const onMove = (e: TouchEvent) => {
      const t = e.touches[0];
      if (start === undefined || t === undefined) return;
      // 左端は右へ、右端は左へ引いた長さ
      const dx = t.clientX - start.x;
      pull = start.side === 'left' ? dx : -dx;
      const dy = t.clientY - start.y;
      if (!pulling) {
        // 縦に動いたらスクロール。こちらは降りる
        if (Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx)) return reset();
        if (pull < 10) return;
        pulling = true;
      }
      // 引いているあいだは画面を横に動かさない
      e.preventDefault();
      show(start.side, Math.max(pull, 0), t.clientY, pull >= THRESHOLD);
    };
    const onEnd = () => {
      const from = start?.side;
      const go = pulling && pull >= THRESHOLD && !popped;
      reset();
      if (!go) return;
      if (from === 'right' && right === 'forward') router.forward();
      else router.back();
    };
    const onPop = () => {
      popped = true;
      reset();
    };

    document.addEventListener('touchstart', onStart, { passive: true });
    document.addEventListener('touchmove', onMove, { passive: false });
    document.addEventListener('touchend', onEnd);
    document.addEventListener('touchcancel', reset);
    window.addEventListener('popstate', onPop);
    return () => {
      document.removeEventListener('touchstart', onStart);
      document.removeEventListener('touchmove', onMove);
      document.removeEventListener('touchend', onEnd);
      document.removeEventListener('touchcancel', reset);
      window.removeEventListener('popstate', onPop);
    };
  }, [enabled, right, router]);

  if (!enabled) return null;
  // 右端で進むときだけ「＞」。ほかは戻るので「＜」
  return (
    <div
      ref={dot}
      aria-hidden
      data-armed="false"
      style={{ left: 0, transform: `translateX(-${HIDDEN}px)`, opacity: 0 }}
      // 離したら元へ戻る動きだけ付ける（引いているあいだは指に付いてくる）
      className="pointer-events-none fixed z-50 grid size-12 place-items-center rounded-full border border-line bg-surface text-foreground shadow-md transition-[transform,opacity,background-color,color] duration-200 ease-(--ease-out) data-[armed=true]:border-accent data-[armed=true]:bg-accent data-[armed=true]:text-background"
    >
      <Icon name={side === 'right' && right === 'forward' ? 'right' : 'left'} className="size-6" />
    </div>
  );
}
