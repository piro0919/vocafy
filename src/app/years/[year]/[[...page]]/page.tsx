import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Heading } from '@/components/heading';
import { Pager, pageOf } from '@/components/pager';
import { SongList } from '@/components/song-list';
import { songsOfYear } from '@/lib/catalog';

// 台帳は取り込みのときにしか変わらないので、1時間は作ったページを使い回す。
// 年の画面はビルドのときには作らず、最初に開かれたときに作って残す
export const revalidate = 3600;

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

/** その年に投稿された曲。新しい順。多い年は PAGE_SIZE 曲ずつのページに分ける */
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
        <p className="mt-2 text-sm text-muted">{total} 曲</p>
      </div>
      <SongList songs={songs} className="grid gap-1 md:grid-cols-2 xl:grid-cols-3" />
      <Pager base={`/years/${year}`} page={page} total={total} />
    </>
  );
}
