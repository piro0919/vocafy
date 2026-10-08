'use client';

import { type ReactNode, useEffect, useState } from 'react';

/**
 * 上の帯。ページの一番上では透明にして、画面の上部の色の背景（ambient.tsx）とつなげる。
 * 少しでもスクロールしたら、下を流れる中身が透けるすりガラスにする（YouTube Music と同じ）
 */
export function Header({ children }: { children: ReactNode }) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 0);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={`chrome-header sticky top-0 z-20 flex items-center gap-4 px-4 py-3 transition-[background-color,backdrop-filter] duration-200 sm:px-8 ${
        scrolled ? 'bg-sidebar/60 backdrop-blur-lg backdrop-saturate-150' : 'bg-transparent'
      }`}
    >
      {children}
    </header>
  );
}
