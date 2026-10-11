'use client';

import { type ReactNode, useEffect, useRef } from 'react';
import { easeOut, MOTION, prefersReducedMotion } from '@/lib/motion';
import { NO_RESTORE } from '@/lib/no-restore';
import { Icon } from './icon';
import { Heading, SECTION } from './heading';
import { edgeMask, useScrollEdges } from './scroll-row';
import { ARROW } from './button-styles';

/**
 * 横に流す帯の送り方（年代の棚と、トップのきょうの日付の曲の列で使う）。帯の要素に track を付ける。
 * watch は帯があとから現れるとき、現れたときに変わる値（useScrollEdges）。
 * edge は端にいるか（矢印を押せなくする・端をぼかすのに使う）、page は矢印で1画面ぶん送る
 */
export function useShelfScroll<T extends HTMLElement = HTMLDivElement>(watch?: unknown) {
  const track = useRef<T>(null);
  const frame = useRef(0);

  /**
   * 横へなめらかに送る。ブラウザの smooth は押した瞬間にいきなり速く動き出してカクっと見えるので、
   * ゆっくり動き出してゆっくり止まる動きを自前で描く。動いているあいだは吸い付きを止める
   * （途中の位置で吸い付こうとして、止まり止まり動くブラウザがある）
   */
  const glide = (el: HTMLElement, to: number) => {
    cancelAnimationFrame(frame.current);
    if (prefersReducedMotion()) {
      el.scrollLeft = to;
      return;
    }
    const from = el.scrollLeft;
    const started = performance.now();
    el.style.scrollSnapType = 'none';
    const step = (now: number) => {
      const t = Math.min(1, (now - started) / MOTION.move);
      el.scrollLeft = from + (to - from) * easeOut(t);
      if (t < 1) frame.current = requestAnimationFrame(step);
      else el.style.scrollSnapType = '';
    };
    frame.current = requestAnimationFrame(step);
  };
  useEffect(() => () => cancelAnimationFrame(frame.current), []);
  // 測る前は、右に続きがあるものとしてぼかす
  const edge = useScrollEdges(track, { start: true, end: false }, watch);

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

  return { track, edge, page };
}

/** 帯を送る左右の矢印。パソコンの幅でだけ出す */
export function ShelfArrows({
  edge,
  page,
}: {
  edge: { start: boolean; end: boolean };
  page: (dir: 1 | -1) => void;
}) {
  return (
    <>
      <ArrowButton label="前へ" disabled={edge.start} onClick={() => page(-1)}>
        <Icon name="left" className="size-5" />
      </ArrowButton>
      <ArrowButton label="次へ" disabled={edge.end} onClick={() => page(1)}>
        <Icon name="right" className="size-5" />
      </ArrowButton>
    </>
  );
}

/**
 * 見出しの付いた、横に流せる棚。左右の矢印で1画面ぶん送る。
 * 年の札の帯（ScrollRow）と同じく、続きがある側の端だけをぼかす。パソコンでは本文の幅の中で流す。
 * 前は流す帯を画面の左端まで伸ばし、左の板の後ろへ流れ込ませていたが、板の字の後ろを札がにじんで通るのを本人が嫌った（2026-10-09）
 */
export function Shelf({
  title,
  eyebrow,
  children,
}: {
  title: string;
  /** 見出しの上に添える小さな英字 */
  eyebrow?: string;
  children: ReactNode;
}) {
  const { track, edge, page } = useShelfScroll();

  return (
    <section className={SECTION}>
      <div className="mb-3 flex items-end gap-3">
        <Heading eyebrow={eyebrow}>{title}</Heading>
        <div className="ml-auto flex items-center gap-2">
          <ShelfArrows edge={edge} page={page} />
        </div>
      </div>
      <div
        ref={track}
        className="bleed-x flex snap-x gap-2 overflow-x-auto py-2 no-scrollbar md:mx-0 md:scroll-px-fade md:px-0"
        style={{ maskImage: edgeMask(edge) }}
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
      className={`hidden ${ARROW} sm:grid`}
    >
      {children}
    </button>
  );
}
