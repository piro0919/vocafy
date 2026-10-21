'use client';

import { type ReactNode, useEffect, useRef } from 'react';

/** このタブで一度跳ねたかの印（sessionStorage）。何度も来る人に毎回見せない */
const SEEN_KEY = 'vocafy-character-hop';
/** 区画のこれだけが画面に入ったら跳ねる */
const VISIBLE_RATIO = 0.5;

const seen = () => {
  try {
    return sessionStorage.getItem(SEEN_KEY) !== null;
  } catch {
    return false;
  }
};
const markSeen = () => {
  try {
    sessionStorage.setItem(SEEN_KEY, '1');
  } catch {
    // 残せなくても、この画面で跳ねるだけ
  }
};

/**
 * トップの歌声の区画の並び。画面に入ったときに、キャラが左の列から順に1回だけ跳ねる（2026-10-11 に本人と決めた）。
 * 跳ねるのは1回のタブで1度だけ。動き（hop）は globals.css、跳ねる絵は browse-cards.tsx の CharacterFace
 */
export function CharacterHop({ className, children }: { className: string; children: ReactNode }) {
  const list = useRef<HTMLUListElement>(null);
  useEffect(() => {
    const el = list.current;
    if (!el || seen()) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        observer.disconnect();
        markSeen();
        // 列の順。画面の幅で列の数が変わるので、札の左の位置から数える。数えるのは見えている札だけ。幅で隠した札
        // （display: none）は左の位置が 0 になり、一番左の列として数えられて、見えている左端の列が1拍遅れて跳ねた
        const items = ([...el.children] as HTMLElement[]).filter(
          (item) => item.offsetParent !== null,
        );
        const columns = [...new Set(items.map((item) => item.offsetLeft))].sort((a, b) => a - b);
        for (const item of items)
          item.style.setProperty('--hop-order', String(columns.indexOf(item.offsetLeft)));
        el.dataset.hop = '';
      },
      { threshold: VISIBLE_RATIO },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return (
    <ul ref={list} className={className}>
      {children}
    </ul>
  );
}
