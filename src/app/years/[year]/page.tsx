import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Heading } from '@/components/heading';
import { SongList } from '@/components/song-list';
import { songsOfYear } from '@/lib/catalog';

// 台帳は取り込みのときにしか変わらないので、1時間は作ったページを使い回す。
// 年の画面はビルドのときには作らず、最初に開かれたときに作って残す
export const revalidate = 3600;

export function generateStaticParams() {
  return [];
}

export async function generateMetadata({ params }: PageProps<'/years/[year]'>): Promise<Metadata> {
  return { title: `${(await params).year}年の曲` };
}

/** その年に投稿された曲。新しい順 */
export default async function YearPage({ params }: PageProps<'/years/[year]'>) {
  const year = Number((await params).year);
  const songs = await songsOfYear(year);
  if (songs.length === 0) notFound();
  return (
    <>
      <div className="pt-4 pb-4 sm:pb-6">
        <Heading as="h1" size="page" eyebrow={String(year)}>
          {year}年の曲
        </Heading>
        <p className="mt-2 text-sm text-muted">{songs.length} 曲</p>
      </div>
      <SongList songs={songs} className="grid gap-1 md:grid-cols-2 xl:grid-cols-3" />
    </>
  );
}
