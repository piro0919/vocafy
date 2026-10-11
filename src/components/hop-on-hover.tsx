'use client';

import { type ReactNode, useEffect, useRef } from 'react';

/**
 * キャラの絵を、指を乗せたときに1回跳ねさせる（browse-cards.tsx の CharacterFace と、歌声の画面の絵）。
 * 乗せた瞬間に跳ね始め、途中で外しても最後まで跳び切る。前は「乗っている間だけ動きを付ける」作り（group-hover）で、
 * 途中で外すと動きが取り消され、絵が元の位置へぱっと戻った（2026-10-11 に本人が指摘）。
 * 跳ねている間は data-hopping を付け、動き（globals.css の hop）が終わったら外す。札（group）全体のどこに乗せても跳ねる
 */
export function HopOnHover({
  children,
  onArrive = false,
}: {
  children: ReactNode;
  /** 画面を開いたときにも1回跳ねる（歌声の画面の絵。札で跳ねたキャラが、移った先でもう1回跳ねてつながる） */
  onArrive?: boolean;
}) {
  const art = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = art.current;
    // 札の中なら札のどこに乗せても、札の外（歌声の画面）なら絵に乗せたときに跳ねる
    const card = el?.closest<HTMLElement>('.group') ?? el;
    if (!el || !card) return;
    if (onArrive) el.dataset.hopping = '';
    const hop = (e: PointerEvent) => {
      if (e.pointerType === 'mouse') el.dataset.hopping = '';
    };
    const land = () => {
      delete el.dataset.hopping;
    };
    card.addEventListener('pointerenter', hop);
    el.addEventListener('animationend', land);
    return () => {
      card.removeEventListener('pointerenter', hop);
      el.removeEventListener('animationend', land);
    };
  }, [onArrive]);
  return (
    <span ref={art} className="absolute inset-0">
      {children}
    </span>
  );
}
