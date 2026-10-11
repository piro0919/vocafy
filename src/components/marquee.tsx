'use client';

import { type ReactNode, useEffect, useRef, useState } from 'react';
import { LINEAR, prefersReducedMotion } from '@/lib/motion';

/** 流す速さ（1秒あたりの px）と、頭で止まっている時間（ミリ秒） */
const SPEED = 30;
const PAUSE = 2000;

/**
 * 長くて枠に収まらない文字だけを、ゆっくり左へ流す（下の帯の曲名や、再生中の行の曲名）。
 * 末尾のあとに間を空けて同じ文字をもう一度並べ、頭が右から入ってきて元の位置に来るまで流し、そこで少し待つ、を繰り返す。
 * 前は末尾で止まってから頭へ一瞬で飛んでいて、飛ぶところが唐突だった（2026-10-12 に本人と決めた。Spotify などのアプリの曲名と同じ）。
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
  const first = useRef<HTMLSpanElement>(null);
  const copy = useRef<HTMLSpanElement>(null);
  // 収まらずに回しているか。回すあいだだけ写しを置く（いつも置くと、収まる文字まで二重に読まれる）
  const [loop, setLoop] = useState(false);

  // 収まるかを測る。写しは測る相手に入れない
  useEffect(() => {
    const outer = box.current;
    const head = first.current;
    if (!outer || !head) return;
    const measure = () => {
      const over = head.getBoundingClientRect().width - outer.clientWidth;
      setLoop(active && over > 1 && !prefersReducedMotion());
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(outer);
    return () => observer.disconnect();
  }, [active, key]);

  // 写しの頭が元の頭の位置に来るまで流すと、1回分の終わりと次の始めがぴったり重なる
  useEffect(() => {
    const text = inner.current;
    const head = first.current;
    const again = copy.current;
    if (!loop || !text || !head || !again) return;
    // 写しの位置は、前に空けた間（padding）の外側なので、間の分を足す。足さないと、1回ごとに間の分だけ引き戻された
    const distance =
      again.getBoundingClientRect().left +
      parseFloat(getComputedStyle(again).paddingLeft) -
      head.getBoundingClientRect().left;
    const move = (distance / SPEED) * 1000;
    const total = PAUSE + move;
    const animation = text.animate(
      [
        { transform: 'translateX(0)', offset: 0 },
        { transform: 'translateX(0)', offset: PAUSE / total },
        { transform: `translateX(-${distance}px)`, offset: 1 },
      ],
      { duration: total, iterations: Infinity, easing: LINEAR },
    );
    return () => animation.cancel();
  }, [loop, key]);

  return (
    // 回しているあいだは … を出さず、はみ出した分は枠で隠す
    <span ref={box} className={`block min-w-0 overflow-hidden whitespace-nowrap ${className}`}>
      <span ref={inner} className={`block ${loop ? '' : 'truncate'}`}>
        <span ref={first}>{children}</span>
        {loop && (
          // 回すための写し。読み上げとキーボードの移動からは外す
          <span ref={copy} aria-hidden inert className="pl-12">
            {children}
          </span>
        )}
      </span>
    </span>
  );
}
