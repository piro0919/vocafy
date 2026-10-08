'use client';

import { useEffect } from 'react';

/**
 * スマホで、下へスクロールしているあいだは上の帯と下のタブを隠し、上へスクロールしたら戻す（YouTube のアプリと同じ）。
 * 画面全体に印（html[data-chrome="hidden"]）を付けるだけで、隠す動きは各部品の側で印を見て付ける。
 * ページの一番上の近くでは常に出す。検索欄に打っているあいだは隠さない。パソコンでは隠さない。何も描かない
 */
export function ScrollChrome() {
  useEffect(() => {
    const root = document.documentElement;
    const mobile = window.matchMedia('(max-width: 47.99rem)');
    let last = window.scrollY;
    let pending = 0;
    const update = () => {
      pending = 0;
      const y = window.scrollY;
      const delta = y - last;
      // 指の小さな揺れで出たり引っ込んだりしないよう、少し動いてから切り替える
      if (Math.abs(delta) < 6) return;
      last = y;
      const typing = document.activeElement?.getAttribute('type') === 'search';
      const hide = mobile.matches && !typing && delta > 0 && y > 80;
      if (hide) root.dataset.chrome = 'hidden';
      else delete root.dataset.chrome;
    };
    const onScroll = () => {
      pending ||= requestAnimationFrame(update);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(pending);
      delete root.dataset.chrome;
    };
  }, []);
  return null;
}
