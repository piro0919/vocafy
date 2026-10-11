'use client';

import { usePathname } from '@/i18n/navigation';
import { useEffect, useRef } from 'react';
import { arrived, endNavigation } from '@/lib/navigation-state';

/**
 * 住所が変わったことを、画面の移動の状態（navigation-state.ts の arrived）に伝える。ブラウザの「戻る」「進む」で変わったかを
 * popstate で見分けて渡す。数え方はあちらにある。画面には何も出さない（layout.tsx に置く）
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
    const prev = last.current;
    last.current = pathname;
    if (prev === null || prev === pathname) {
      endNavigation();
      return;
    }
    arrived(pathname, popped.current);
    popped.current = false;
  }, [pathname]);

  return null;
}
