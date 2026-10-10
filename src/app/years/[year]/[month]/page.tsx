import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Heading } from '@/components/heading';
import { PlayAll } from '@/components/play-all';
import { VirtualSongList } from '@/components/virtual-song-list';
import { MONTH, playlistOfMonth, songsOfMonth } from '@/lib/catalog';
import { playlistCount } from '@/lib/list-titles';

// 流す曲（全曲から選ぶピックアップ）を日ごとに選び直すので、1日ごとに作り直す（catalog.ts の Playlist）。
// 作り直すのは開かれたページだけで、DB を起こすのはその日の1回目だけ
export const revalidate = 86400;

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
  const playlist = await playlistOfMonth(Number(year), month);
  return (
    <>
      <div className="pt-4 pb-4 sm:pb-6">
        <Heading as="h1" size="page" eyebrow={year}>
          {year}年{Number(month)}月の曲
        </Heading>
        <PlayAll
          songs={playlist.songs}
          count={playlistCount(playlist)}
          list={{ source, page: 1, last: 1 }}
          pickup={playlist.pickup}
        />
      </div>
      <VirtualSongList source={source} page={1} songs={songs} total={total} />
    </>
  );
}
