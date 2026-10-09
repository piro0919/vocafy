import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Heading } from '@/components/heading';
import { PlayAll } from '@/components/play-all';
import { VirtualSongList } from '@/components/virtual-song-list';
import { MONTH, PAGE_SIZE, songsOfMonth } from '@/lib/catalog';
import { formatCount } from '@/lib/format';

// 台帳は取り込みのときにしか変わらないので、時間では作り直さず、次の配備まで作ったページを使い回す（DB を起こさないため）。
// ビルドのときには作らず、最初に開かれたときに作って残す
export const revalidate = false;

export function generateStaticParams() {
  return [];
}

export async function generateMetadata({
  params,
}: PageProps<'/years/[year]/[month]'>): Promise<Metadata> {
  const { year, month } = await params;
  return { title: `${year}年${Number(month)}月の曲` };
}

/**
 * その年のその月の曲。年の画面の月の「すべて表示」から。新しい順で、多い月もスクロールで続きを出す（VirtualSongList）。
 * 前の年の全曲の画面のページ（/years/2010/2）は、next.config.ts で年の画面へ送る
 */
export default async function MonthPage({ params }: PageProps<'/years/[year]/[month]'>) {
  const { year, month } = await params;
  if (!/^\d{4}$/.test(year) || !MONTH.test(month)) notFound();
  const { songs, total } = await songsOfMonth(Number(year), month, 1);
  if (songs.length === 0) notFound();
  const source = `years/${year}/${month}`;
  return (
    <>
      <div className="pt-4 pb-4 sm:pb-6">
        <Heading as="h1" size="page" eyebrow={year}>
          {year}年{Number(month)}月の曲
        </Heading>
        <PlayAll
          songs={songs}
          count={`${formatCount(total)}曲`}
          list={{ source, page: 1, last: Math.ceil(total / PAGE_SIZE) }}
        />
      </div>
      <VirtualSongList source={source} page={1} songs={songs} total={total} />
    </>
  );
}
