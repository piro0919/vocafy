'use client';

import { useCallback, useSyncExternalStore } from 'react';

/**
 * 画面の幅に合わせた段の数。CSS の格子（grid-cols）と同じ幅で切り替えるよう、広い方から { query, columns } を並べて渡す。
 * どれにも当たらなければ narrow。サーバーでは幅が分からないので narrow で描き、ブラウザで読み直す。
 * 見えている行だけを描く一覧（TanStack Virtual）で、行に何人・何曲入るかを決めるのに使う
 */
export function useColumns(
  breakpoints: readonly { query: string; columns: number }[],
  narrow: number,
): number {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const lists = breakpoints.map((b) => window.matchMedia(b.query));
      for (const l of lists) l.addEventListener('change', onChange);
      return () => {
        for (const l of lists) l.removeEventListener('change', onChange);
      };
    },
    [breakpoints],
  );
  const read = useCallback(
    () => breakpoints.find((b) => window.matchMedia(b.query).matches)?.columns ?? narrow,
    [breakpoints, narrow],
  );
  return useSyncExternalStore(subscribe, read, () => narrow);
}
