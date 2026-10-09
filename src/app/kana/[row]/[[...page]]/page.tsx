import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Heading } from '@/components/heading';
import { pageOf } from '@/components/pager';
import { PlayAll } from '@/components/play-all';
import { VirtualSongList } from '@/components/virtual-song-list';
import { PAGE_SIZE, songsOfRow } from '@/lib/catalog';
import { isRow, ROWS } from '@/lib/kana';
import { rowTitle } from '@/lib/list-titles';
import { formatCount } from '@/lib/format';

// 台帳は取り込みのときにしか変わらないので、時間では作り直さず、次の配備まで作ったページを使い回す（DB を起こさないため）。
export const revalidate = false;

/** 行は12しかないので、各行の1ページ目はビルドのときに作る。2ページ目からは最初に開かれたときに作る */
export function generateStaticParams() {
  return ROWS.map((row) => ({ row }));
}

export async function generateMetadata({
  params,
}: PageProps<'/kana/[row]/[[...page]]'>): Promise<Metadata> {
  const { row: raw, page } = await params;
  const row = decodeURIComponent(raw);
  const n = pageOf(page);
  return {
    title: isRow(row) ? `${rowTitle(row)}の曲${n && n > 1 ? `（${n}ページ目）` : ''}` : undefined,
  };
}

/** 曲名の頭の文字で引く索引の1行。曲名の順。多い行もページに分けず、スクロールで続きを出す（VirtualSongList） */
export default async function KanaPage({ params }: PageProps<'/kana/[row]/[[...page]]'>) {
  const { row: raw, page: segments } = await params;
  const row = decodeURIComponent(raw);
  const page = pageOf(segments);
  if (!isRow(row) || !page) notFound();
  const { songs, total } = await songsOfRow(row, page);
  // 1ページ目は、曲が無い行でも見出しだけ出す（CI の台帳など）。2ページ目からは無ければ 404
  if (page > 1 && songs.length === 0) notFound();
  return (
    <>
      <div className="pt-4 pb-4 sm:pb-6">
        <Heading as="h1" size="page" eyebrow="Index">
          {rowTitle(row)}の曲
        </Heading>
        <PlayAll
          songs={songs}
          count={`${formatCount(total)} 曲`}
          list={{ source: `kana/${row}`, page, last: Math.ceil(total / PAGE_SIZE) }}
        />
      </div>
      <VirtualSongList source={`kana/${row}`} page={page} songs={songs} total={total} />
    </>
  );
}
