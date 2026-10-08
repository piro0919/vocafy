'use client';

import Link from 'next/link';
import { type ReactNode, useEffect, useRef, useState } from 'react';
import { prefersReducedMotion } from '@/lib/motion';
import { NO_RESTORE } from '@/lib/no-restore';
import { Icon } from './icon';
import { Heading } from './heading';

/** 矢印で送るときの時間（ミリ秒） */
const GLIDE_MS = 500;

/** ゆっくり動き出して、ゆっくり止まる */
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

/**
 * 見出しの付いた、横に流せる棚。左右の矢印で1画面ぶん送る。
 * 棚と棚の間は、スマホでは詰める（縦に長い画面で棚を次々に流して見ると、空きが積み重なって間延びする）
 */
export function Shelf({
  title,
  eyebrow,
  href,
  children,
}: {
  title: string;
  /** 見出しの上に添える小さな英字 */
  eyebrow?: string;
  /** 「すべて表示」の行き先 */
  href?: string;
  children: ReactNode;
}) {
  const track = useRef<HTMLDivElement>(null);
  const frame = useRef(0);

  /**
   * 横へなめらかに送る。ブラウザの smooth は押した瞬間にいきなり速く動き出してカクっと見えるので、
   * ゆっくり動き出してゆっくり止まる動きを自前で描く。動いているあいだは吸い付きを止める
   * （途中の位置で吸い付こうとして、止まり止まり動くブラウザがある）
   */
  const glide = (el: HTMLDivElement, to: number) => {
    cancelAnimationFrame(frame.current);
    if (prefersReducedMotion()) {
      el.scrollLeft = to;
      return;
    }
    const from = el.scrollLeft;
    const started = performance.now();
    el.style.scrollSnapType = 'none';
    const step = (now: number) => {
      const t = Math.min(1, (now - started) / GLIDE_MS);
      el.scrollLeft = from + (to - from) * easeInOut(t);
      if (t < 1) frame.current = requestAnimationFrame(step);
      else el.style.scrollSnapType = '';
    };
    frame.current = requestAnimationFrame(step);
  };
  useEffect(() => () => cancelAnimationFrame(frame.current), []);
  const [edge, setEdge] = useState({ start: true, end: false });

  const update = () => {
    const el = track.current;
    if (!el) return;
    setEdge({
      start: el.scrollLeft <= 1,
      end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 1,
    });
  };
  useEffect(update, []);

  /**
   * 1画面ぶん送る。送り先はカードの頭（吸い付く位置）にそろえる。幅の何割かで送ると、止まった位置が
   * カードの途中になり、ブラウザによってはそこから頭へ吸い付く動きがもう一段起きて、カクっと見える。
   * 次へは、右端で切れているカードを左端へ。前へは、今の左端のカードが右端に収まるところまで戻す
   */
  const page = (dir: 1 | -1) => {
    const el = track.current;
    if (!el) return;
    const style = getComputedStyle(el);
    const padStart = parseFloat(style.scrollPaddingLeft) || 0;
    const padEnd = parseFloat(style.scrollPaddingRight) || 0;
    const view = el.clientWidth - padStart - padEnd;
    const origin = el.getBoundingClientRect().left + padStart - el.scrollLeft;
    // 吸い付く位置。曲の棚は格子の中の各行が吸い付くので、子の子まで拾う。
    // 行を包む格子そのものにも印が付いているので、棚より幅の広いものは除く
    const items = [...el.querySelectorAll<HTMLElement>('.snap-start')]
      .map((item) => {
        const r = item.getBoundingClientRect();
        return { start: r.left - origin, end: r.right - origin };
      })
      .filter((i) => i.end - i.start <= view);
    const max = el.scrollWidth - el.clientWidth;
    const now = el.scrollLeft;
    const target =
      dir === 1
        ? (items.find((i) => i.end > now + view + 1)?.start ?? max)
        : (items.find((i) => i.start >= now - view - 1 && i.start < now - 1)?.start ?? 0);
    glide(el, Math.max(0, Math.min(max, target)));
  };

  return (
    <section className="mt-7 first:mt-2 sm:mt-10 sm:first:mt-4">
      <div className="mb-2 flex items-end gap-3">
        <Heading eyebrow={eyebrow}>{title}</Heading>
        <div className="ml-auto flex items-center gap-2">
          {href && (
            <Link
              href={href}
              className="rounded-full border border-line/60 bg-sidebar/60 px-3 py-1 text-xs font-bold text-foreground transition-colors hover:bg-sidebar/90"
            >
              すべて表示
            </Link>
          )}
          <ArrowButton label="前へ" disabled={edge.start} onClick={() => page(-1)}>
            <Icon name="left" className="size-5" />
          </ArrowButton>
          <ArrowButton label="次へ" disabled={edge.end} onClick={() => page(1)}>
            <Icon name="right" className="size-5" />
          </ArrowButton>
        </div>
      </div>
      <div
        ref={track}
        onScroll={update}
        className="-mx-4 flex snap-x scroll-px-4 gap-4 overflow-x-auto px-4 py-2 [scrollbar-width:none] sm:-mx-8 sm:scroll-px-8 sm:px-8 [&::-webkit-scrollbar]:hidden"
      >
        {children}
      </div>
    </section>
  );
}

function ArrowButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      {...NO_RESTORE}
      onClick={onClick}
      className="hidden size-8 place-items-center rounded-full border border-line/60 bg-sidebar/60 text-foreground transition-[background-color,scale,opacity] duration-150 ease-out hover:bg-sidebar/90 active:scale-95 disabled:opacity-40 disabled:hover:bg-sidebar/60 sm:grid"
    >
      {children}
    </button>
  );
}
