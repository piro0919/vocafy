'use client';

import { type ReactNode, useEffect, useRef, useState } from 'react';

/** 端のぼかしの幅（px） */
const FADE = 24;

/**
 * 1行で横にスクロールする並び。スクロールバーは見せず、続きがある側の端だけをぼかす
 * （左端にいるときは右だけ、右端まで来たら左だけ、全部が収まるときはぼかさない）。
 * ぼかしは mask の幅を CSS の変数で切り替える。スクロールと大きさの変化を見張って付け外しする
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
  const [edges, setEdges] = useState({ left: false, right: false });

  useEffect(() => {
    const el = row.current;
    if (!el) return;
    const update = () => {
      const left = el.scrollLeft > 1;
      const right = el.scrollLeft + el.clientWidth < el.scrollWidth - 1;
      setEdges((prev) => (prev.left === left && prev.right === right ? prev : { left, right }));
    };
    update();
    el.addEventListener('scroll', update, { passive: true });
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => {
      el.removeEventListener('scroll', update);
      observer.disconnect();
    };
  }, []);

  return (
    <nav
      ref={row}
      aria-label={label}
      className={`flex overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${className}`}
      style={
        {
          '--fade-l': edges.left ? `${FADE}px` : '0px',
          '--fade-r': edges.right ? `${FADE}px` : '0px',
          maskImage:
            'linear-gradient(to right, transparent, black var(--fade-l), black calc(100% - var(--fade-r)), transparent)',
        } as React.CSSProperties
      }
    >
      {children}
    </nav>
  );
}
