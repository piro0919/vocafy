'use client';

import { useWindowVirtualizer, windowScroll } from '@tanstack/react-virtual';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { QueueItem } from '@/lib/catalog';
import { useColumns } from '@/lib/use-columns';
import { SongItem, useOpenSong } from './song-list';

/** /api/list が1回に返す曲の数（src/lib/catalog.ts の PAGE_SIZE と同じ） */
const PAGE_SIZE = 300;
/** 1行の高さ（px）。サムネイル 48px ＋上下の余白 12px ＋行のあいだ 4px */
const ROW = 64;

/** 段の数。曲の一覧（SongList）の md:grid-cols-2 xl:grid-cols-3 と同じ幅で切り替える */
const COLUMNS = [
  { query: '(min-width: 80rem)', columns: 3 },
  { query: '(min-width: 48rem)', columns: 2 },
] as const;

/**
 * 長い曲の一覧（年・あいうえお順・歌声の年）。ページ番号で区切らず、下へスクロールすると続きが出る。
 * あいうえお順の行は 7000 曲を超えるので、全部を描かず、画面に見えている行だけを描く（TanStack Virtual）。
 * 曲の総数は最初に分かっているので、一覧の高さは最初から全体の分を取る。
 * 曲は /api/list から PAGE_SIZE 曲ずつ、見えてきた行のぶんだけ読む（下へ一気に飛ばしても、飛んだ先のページだけを読む）。
 * 最初のページはページと一緒に渡す。/years/2026/3 のようにページ番号付きで開いたときは、そのページの先頭へスクロールする
 */
export function VirtualSongList({
  source,
  page,
  songs,
  total,
  columns: fixed,
  onOpen,
}: {
  /** 一覧の住所（years/2026 など）。/api/list の住所に使う */
  source: string;
  /** songs が何ページ目か */
  page: number;
  songs: QueueItem[];
  total: number;
  /** 段の数を幅で変えずに決めるとき（一覧の再生用の画面の、右の細い列では 1） */
  columns?: number;
  /**
   * 曲を押したときの動き。その曲のページの曲と、ページの中の何番目かを渡す。
   * 渡さなければ、その曲のボカロPの画面へ移る（useOpenSong）
   */
  onOpen?: (page: { number: number; songs: QueueItem[] }, at: number) => void;
}) {
  const byWidth = useColumns(COLUMNS, 1);
  const columns = fixed ?? byWidth;
  const open = useOpenSong();
  const [pages, setPages] = useState(() => new Map([[page, songs]]));
  const requested = useRef(new Set([page]));

  // 一覧の上端の、ページの頭からの位置。画面のスクロールの位置から、どの行が見えているかを割り出すのに使う
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

  const rows = Math.ceil(total / columns);
  const virtualizer = useWindowVirtualizer({
    count: rows,
    estimateSize: () => ROW,
    overscan: 8,
    scrollMargin: margin,
    // サーバーでも最初の数十行は描く（スクロールの位置が分からないので、上から）
    initialRect: { width: 0, height: 1200 },
    // 付けたときに覚えている位置へ戻すスクロール（behavior の無いもの）は通さない。
    // 別の画面から移ってきた直後は前の画面の位置を覚えていて、Next.js が先頭へ戻したあとにそこへ書き戻していた。
    // 開発のときは effect が2回走るので必ず起き、本番でも順序しだいで起きうる。scrollToIndex は behavior を付けて呼ぶので通る
    scrollToFn: (offset, options, instance) => {
      if (options.behavior) windowScroll(offset, options, instance);
    },
  });
  const items = virtualizer.getVirtualItems();

  // ページ番号付きで開いたときは、そのページの先頭へ
  const jumped = useRef(false);
  useEffect(() => {
    if (jumped.current || page === 1 || margin === 0) return;
    jumped.current = true;
    virtualizer.scrollToIndex(Math.floor(((page - 1) * PAGE_SIZE) / columns), { align: 'start' });
  }, [page, margin, columns, virtualizer]);

  // 見えている行の曲が手元に無ければ、そのページを読む
  const first = items[0]?.index ?? 0;
  const last = items.at(-1)?.index ?? 0;
  useEffect(() => {
    const from = Math.floor((first * columns) / PAGE_SIZE) + 1;
    const to = Math.floor(Math.min(total - 1, (last + 1) * columns - 1) / PAGE_SIZE) + 1;
    for (let p = from; p <= to; p++) {
      if (requested.current.has(p)) continue;
      requested.current.add(p);
      fetch(`/api/list/${source}/${p}`)
        .then((res) => (res.ok ? (res.json() as Promise<QueueItem[]>) : Promise.reject()))
        .then((loaded) => setPages((prev) => new Map(prev).set(p, loaded)))
        // 読めなかったページは、次に見えたときにもう一度読む
        .catch(() => requested.current.delete(p));
    }
  }, [first, last, columns, total, source]);

  const songAt = (i: number) => pages.get(Math.floor(i / PAGE_SIZE) + 1)?.[i % PAGE_SIZE];

  return (
    <div ref={list} className="relative" style={{ height: virtualizer.getTotalSize() }}>
      {items.map((row) => (
        <div
          key={row.key}
          className="absolute inset-x-0 top-0 grid gap-x-1"
          style={{
            height: ROW,
            transform: `translateY(${row.start - virtualizer.options.scrollMargin}px)`,
            gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
          }}
        >
          {Array.from({ length: columns }, (_, c) => {
            const i = row.index * columns + c;
            if (i >= total) return null;
            const song = songAt(i);
            return song ? (
              <SongItem
                key={i}
                song={song}
                eager={i < 8}
                onOpen={() => {
                  const number = Math.floor(i / PAGE_SIZE) + 1;
                  if (onOpen) onOpen({ number, songs: pages.get(number) ?? [] }, i % PAGE_SIZE);
                  else open(song);
                }}
              />
            ) : (
              // まだ読んでいない曲。サムネイルと2行の字の形だけ出す
              <div key={i} aria-hidden className="flex items-center gap-3 p-1.5">
                <span className="h-12 w-[85px] shrink-0 rounded bg-surface" />
                <span className="flex min-w-0 flex-1 flex-col gap-1.5">
                  <span className="h-3.5 w-2/3 rounded bg-surface" />
                  <span className="h-3 w-1/2 rounded bg-surface/70" />
                </span>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
