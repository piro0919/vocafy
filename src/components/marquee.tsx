'use client';

import { type ReactNode, useEffect, useRef } from 'react';
import { prefersReducedMotion } from '@/lib/motion';

/** 流す速さ（1秒あたりの px）と、両端で止まっている時間（ミリ秒） */
const SPEED = 30;
const PAUSE = 2000;

/**
 * 長くて枠に収まらない文字だけを、ゆっくり左へ流す（下の帯の曲名や、再生中の行の曲名）。
 * 始めに少し待ってから末尾が見えるまで流し、末尾で少し止まって、頭に戻ってまた待つ、を繰り返す。
 * 収まる文字と、動きを減らす設定の人には流さず、末尾を … で切る。active が false のあいだも流さない
 */
export function Marquee({
  children,
  text,
  active = true,
  className = '',
}: {
  children: ReactNode;
  /**
   * 流し直すきっかけになる文字。children が文字ならそれを使う。リンクなどを含むときは渡す。
   * 親が描き直されるたびに流し直すと、いつまでも動き出さないので、文字が変わったときだけ流し直す
   */
  text?: string;
  active?: boolean;
  className?: string;
}) {
  const key = typeof children === 'string' ? children : (text ?? '');
  const box = useRef<HTMLSpanElement>(null);
  const inner = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const outer = box.current;
    const text = inner.current;
    if (!outer || !text) return;
    let animation: Animation | null = null;

    const start = () => {
      animation?.cancel();
      animation = null;
      outer.dataset.overflow = 'false';
      const distance = text.scrollWidth - outer.clientWidth;
      if (!active || distance <= 1 || prefersReducedMotion()) return;
      outer.dataset.overflow = 'true';
      const move = (distance / SPEED) * 1000;
      const total = PAUSE + move + PAUSE;
      animation = text.animate(
        [
          { transform: 'translateX(0)', offset: 0 },
          { transform: 'translateX(0)', offset: PAUSE / total },
          { transform: `translateX(-${distance}px)`, offset: (PAUSE + move) / total },
          { transform: `translateX(-${distance}px)`, offset: 1 },
        ],
        { duration: total, iterations: Infinity, easing: 'linear' },
      );
    };

    start();
    const observer = new ResizeObserver(start);
    observer.observe(outer);
    return () => {
      observer.disconnect();
      animation?.cancel();
    };
  }, [active, key]);

  return (
    // 流しているあいだは … を出さず、はみ出した分は枠で隠す
    <span
      ref={box}
      className={`block min-w-0 overflow-hidden whitespace-nowrap [&[data-overflow=false]>span]:truncate ${className}`}
    >
      <span ref={inner} className="block">
        {children}
      </span>
    </span>
  );
}
