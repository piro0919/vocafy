import { useWindowVirtualizer, windowScroll } from '@tanstack/react-virtual';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';

/** サーバーで描くときに、画面の高さとみなす値（px）。この高さに入る行だけを描く */
const SERVER_HEIGHT = 1200;

/**
 * 画面ごとスクロールする長い一覧の、見えている行だけを描く仕組み（月の曲の一覧・ボカロPの一覧）。TanStack Virtual の
 * useWindowVirtualizer に、どちらの一覧にも要る3つを足す。
 * - 一覧の上端の、ページの頭からの位置（scrollMargin）を測り、ページの高さが変わったら測り直す
 * - 付けたときに覚えている位置へ戻すスクロール（behavior の無いもの）は通さない。別の画面から移ってきた直後は前の画面の位置を
 *   覚えていて、Next.js が先頭へ戻したあとにそこへ書き戻していた（開発のときは effect が2回走るので必ず起き、本番でも順序しだいで起きうる）
 * - jumpRow が 0 より大きければ、開いたときに一度だけその行を先頭までスクロールする（住所のページ番号から開いたとき）
 * list は一覧を包む要素に付ける
 */
export function useWindowList({
  rows,
  estimate,
  overscan,
  jumpRow,
}: {
  rows: number;
  estimate: number;
  overscan: number;
  jumpRow: number;
}) {
  const list = useRef<HTMLDivElement>(null);
  const [margin, setMargin] = useState(0);
  useLayoutEffect(() => {
    const el = list.current;
    if (!el) return;
    const measure = () => setMargin(el.getBoundingClientRect().top + window.scrollY);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(document.body);
    return () => observer.disconnect();
  }, []);

  const virtualizer = useWindowVirtualizer({
    count: rows,
    estimateSize: () => estimate,
    overscan,
    scrollMargin: margin,
    // サーバーでも最初の数段は描く（スクロールの位置が分からないので、上から）
    initialRect: { width: 0, height: SERVER_HEIGHT },
    // scrollToIndex は behavior を付けて呼ぶので通る
    scrollToFn: (offset, options, instance) => {
      if (options.behavior) windowScroll(offset, options, instance);
    },
  });

  const jumped = useRef(false);
  useEffect(() => {
    if (jumped.current || jumpRow <= 0 || margin === 0) return;
    jumped.current = true;
    virtualizer.scrollToIndex(jumpRow, { align: 'start' });
  }, [jumpRow, margin, virtualizer]);

  return { list, margin, virtualizer };
}
