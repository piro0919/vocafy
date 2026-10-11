'use client';

import { CoverCard } from '@/components/cover-card';
import type { Producer } from '@/lib/catalog';
import { useColumns } from '@/lib/use-columns';
import { formatCount } from '@/lib/format';
import { atLeast } from '@/lib/breakpoints';
import { EAGER_IMAGES } from '@/lib/image-sizes';
import { useWindowList } from '@/components/use-window-list';

/** 段の数。cover-card.tsx の ARTIST_GRID（grid-cols-3 sm:4 lg:5 xl:6）と同じ幅で切り替える */
/** 段の数を決められないとき（サーバーで描くとき）の段の数 */
const COLUMNS_BASE = 3;
const COLUMNS = [
  { query: atLeast('xl'), columns: 6 },
  { query: atLeast('lg'), columns: 5 },
  { query: atLeast('sm'), columns: 4 },
] as const;
/** 段の高さの見込み（px）。札の高さは幅で変わるので、描いたあとに測り直す */
const ESTIMATE = 220;

/**
 * ボカロPの一覧。ページ番号で区切らず、全員を1つの格子にする。全員を描くと 775 人で HTML が 1.7MB になったので、
 * 画面に見えている段だけを描く（TanStack Virtual）。データは名前・画像・曲数だけで小さいので、全員分を最初に渡す。
 * /producers/page/3 のような前の住所で開いたときは、そのページの先頭の人の段へスクロールする
 */
export function VirtualProducerGrid({
  producers,
  start = 0,
}: {
  producers: Producer[];
  /** 開いたときに先頭に出す人の番号（0 から） */
  start?: number;
}) {
  const columns = useColumns(COLUMNS, COLUMNS_BASE);

  const { list, virtualizer } = useWindowList({
    rows: Math.ceil(producers.length / columns),
    estimate: ESTIMATE,
    overscan: 3,
    jumpRow: Math.floor(start / columns),
  });

  return (
    <div ref={list} className="relative" style={{ height: virtualizer.getTotalSize() }}>
      {virtualizer.getVirtualItems().map((row) => (
        <div
          key={row.key}
          data-index={row.index}
          ref={virtualizer.measureElement}
          // 段のあいだは ARTIST_GRID の gap-y-6 と同じ
          className="absolute inset-x-0 top-0 grid gap-x-4 pb-6"
          style={{
            transform: `translateY(${row.start - virtualizer.options.scrollMargin}px)`,
            gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
          }}
        >
          {producers.slice(row.index * columns, (row.index + 1) * columns).map((p, c) => (
            <CoverCard
              key={p.id}
              href={`/producers/${p.id}`}
              playing={{ producerId: p.id }}
              cover={p.picture}
              round
              title={p.name}
              sub={`${formatCount(p.songCount)}曲`}
              eager={row.index * columns + c < EAGER_IMAGES}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
