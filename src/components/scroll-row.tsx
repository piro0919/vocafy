'use client';

import { type ReactNode, type RefObject, useEffect, useRef, useState } from 'react';

/** 端のぼかしの幅。棚（shelf.tsx）も同じ幅でぼかす（globals.css の --spacing-fade） */
const FADE = 'var(--spacing-fade)';

/** スクロールする要素の端。start は左端（縦なら上端）にいる、end は右端（縦なら下端）にいる */
export type Edge = { start: boolean; end: boolean };

/** スクロールの向き。x は横、y は縦（左のメニューのお気に入りのボカロP） */
export type Axis = 'x' | 'y';

/** 帯の端のぼかし。続きのある側だけ */
export function edgeMask(edge: Edge, axis: Axis = 'x') {
  return `linear-gradient(to ${axis === 'x' ? 'right' : 'bottom'}, transparent, black ${edge.start ? '0px' : FADE}, black calc(100% - ${edge.end ? '0px' : FADE}), transparent)`;
}

/**
 * スクロールする要素が端にいるか（年の札の帯と、棚と、左のメニューのお気に入りのボカロP）。スクロールと大きさの変化を見張り、変わったときだけ描き直す
 * （同じ値を入れ直すと、スクロールのたびに中身ごと描き直された）。initial は測る前（サーバーで描くとき）の値。
 * 要素があとから現れるとき（読み終えてから出す棚）は、現れたときに変わる値を watch に渡すと、そこで見張り始める
 */
export function useScrollEdges(
  ref: RefObject<HTMLElement | null>,
  initial: Edge,
  watch?: unknown,
  axis: Axis = 'x',
): Edge {
  const [edge, setEdge] = useState(initial);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => {
      const [pos, size, total] =
        axis === 'x'
          ? [el.scrollLeft, el.clientWidth, el.scrollWidth]
          : [el.scrollTop, el.clientHeight, el.scrollHeight];
      const start = pos <= 1;
      const end = pos + size >= total - 1;
      setEdge((prev) => (prev.start === start && prev.end === end ? prev : { start, end }));
    };
    update();
    el.addEventListener('scroll', update, { passive: true });
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => {
      el.removeEventListener('scroll', update);
      observer.disconnect();
    };
  }, [ref, watch, axis]);
  return edge;
}

/**
 * 1行で横にスクロールする並び。スクロールバーは見せず、続きがある側の端だけをぼかす
 * （左端にいるときは右だけ、右端まで来たら左だけ、全部が収まるときはぼかさない）
 */
export function ScrollRow({
  children,
  className = '',
  label,
}: {
  children: ReactNode;
  className?: string;
  /** 並びの読み上げの名前 */
  label?: string;
}) {
  const row = useRef<HTMLElement>(null);
  // 測る前はぼかさない
  const edge = useScrollEdges(row, { start: true, end: true });

  return (
    <nav
      ref={row}
      aria-label={label}
      className={`flex overflow-x-auto no-scrollbar ${className}`}
      style={{ maskImage: edgeMask(edge) }}
    >
      {children}
    </nav>
  );
}
