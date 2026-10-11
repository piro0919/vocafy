'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { navigationDepth, setNavigationDepth } from '@/lib/leave';

/**
 * サイトの中で何画面進んだかを数える（leave.ts）。住所が変わるたびに1つ進め、ブラウザの「戻る」「進む」で変わったときは
 * 1つ戻す。「進む」と「戻る」は見分けられないので、「進む」でも戻す（そのときは縮める操作がトップへ移る側に倒れ、
 * サイトの外には出ない）。画面には何も出さない（layout.tsx に置く）
 */
export function NavigationDepth() {
  const pathname = usePathname();
  const first = useRef(true);
  const popped = useRef(false);

  useEffect(() => {
    const onPop = () => {
      popped.current = true;
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    setNavigationDepth(Math.max(0, navigationDepth() + (popped.current ? -1 : 1)));
    popped.current = false;
  }, [pathname]);

  return null;
}
