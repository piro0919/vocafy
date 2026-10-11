'use client';

import { usePathname } from '@/i18n/navigation';
import { useEffect, useRef } from 'react';
import { arrivedByReplace, navigationDepth, setNavigationDepth } from '@/lib/leave';
import { endNavigation } from '@/lib/pending-navigation';

/**
 * サイトの中で何画面進んだかを数える（leave.ts）。住所が変わるたびに1つ進め、ブラウザの「戻る」「進む」で変わったときは
 * 1つ戻し、置き換え（router.replace）で変わったときは数えない。「進む」と「戻る」は見分けられないので、「進む」でも戻す
 * （そのときは縮める操作がトップへ移る側に倒れ、サイトの外には出ない）。住所が変わったら、移動中の印（pending-navigation.ts）も外す。画面には何も出さない（layout.tsx に置く）
 */
export function NavigationDepth() {
  const pathname = usePathname();
  // 前に数えた住所。開いた最初の住所は数えない。同じ住所で effect がもう一度走っても（開発の StrictMode）数えない
  const last = useRef<string | null>(null);
  const popped = useRef(false);

  useEffect(() => {
    const onPop = () => {
      popped.current = true;
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  useEffect(() => {
    // 住所が変わったので、移動中の印を外す（pending-navigation.ts）
    endNavigation();
    const prev = last.current;
    last.current = pathname;
    if (prev === null || prev === pathname) return;
    // 置き換えで移ったときは履歴が増えていないので数えない（leave.ts の markReplace）
    if (arrivedByReplace(pathname)) {
      popped.current = false;
      return;
    }
    setNavigationDepth(Math.max(0, navigationDepth() + (popped.current ? -1 : 1)));
    popped.current = false;
  }, [pathname]);

  return null;
}
