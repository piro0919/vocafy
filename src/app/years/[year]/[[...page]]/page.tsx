import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Heading } from '@/components/heading';
import { pageOf } from '@/components/pager';
import { PlayAll } from '@/components/play-all';
import { VirtualSongList } from '@/components/virtual-song-list';
import { PAGE_SIZE, songsOfYear } from '@/lib/catalog';

// 台帳は取り込みのときにしか変わらないので、時間では作り直さず、次の配備まで作ったページを使い回す（DB を起こさないため）。
// 年の画面はビルドのときには作らず、最初に開かれたときに作って残す
export const revalidate = false;

export function generateStaticParams() {
  return [];
}

export async function generateMetadata({
  params,
}: PageProps<'/years/[year]/[[...page]]'>): Promise<Metadata> {
  const { year, page } = await params;
  const n = pageOf(page);
  return { title: `${year}年の曲${n && n > 1 ? `（${n}ページ目）` : ''}` };
}

/** その年に投稿された曲。新しい順。多い年もページに分けず、スクロールで続きを出す（VirtualSongList） */
export default async function YearPage({ params }: PageProps<'/years/[year]/[[...page]]'>) {
  const { year: raw, page: segments } = await params;
  const year = Number(raw);
  const page = pageOf(segments);
  if (!page) notFound();
  const { songs, total } = await songsOfYear(year, page);
  if (songs.length === 0) notFound();
  return (
    <>
      <div className="pt-4 pb-4 sm:pb-6">
        <Heading as="h1" size="page" eyebrow={String(year)}>
          {year}年の曲
        </Heading>
        <PlayAll
          songs={songs}
          count={`${total} 曲`}
          list={{ source: `years/${year}`, page, last: Math.ceil(total / PAGE_SIZE) }}
        />
      </div>
      <VirtualSongList source={`years/${year}`} page={page} songs={songs} total={total} />
    </>
  );
}
