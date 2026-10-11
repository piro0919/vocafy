import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Heading } from '@/components/heading';
import { PlayAll } from '@/components/play-all';
import { VirtualSongList } from '@/components/virtual-song-list';
import { MONTH, playlistOfMonth, songsOfMonth } from '@/lib/catalog';
import { formatCount } from '@/lib/format';
import { langOf } from '@/i18n/config';
import { defineText } from '@/i18n/text';
import { TERMS } from '@/i18n/terms';

const TEXT = defineText({
  ja: { title: (year: string, month: number) => `${year}年${month}月の曲` },
  en: { title: (year: string, month: number) => `Songs from ${TERMS.en.yearMonth(year, month)}` },
});

// 流す曲（全曲から選ぶピックアップ）を日ごとに選び直すので、1日ごとに作り直す（catalog.ts の Playlist）。
// 作り直すのは開かれたページだけで、DB を起こすのはその日の1回目だけ
export const revalidate = 86400;

export function generateStaticParams() {
  return [];
}

export async function generateMetadata({
  params,
}: PageProps<'/[lang]/years/[year]/[month]'>): Promise<Metadata> {
  const { year, month } = await params;
  if (!/^\d{4}$/.test(year) || !MONTH.test(month)) notFound();
  if ((await songsOfMonth(Number(year), month, 1)).songs.length === 0) notFound();
  return { title: TEXT[await langOf(params)].title(year, Number(month)) };
}

/**
 * その年のその月の曲。年の画面の月の「すべて表示」から。新しい順で、多い月もスクロールで続きを出す（VirtualSongList）。
 * 前の年の全曲の画面のページ（/years/2010/2）は、next.config.ts で年の画面へ送る
 */
export default async function MonthPage({ params }: PageProps<'/[lang]/years/[year]/[month]'>) {
  const { year, month } = await params;
  if (!/^\d{4}$/.test(year) || !MONTH.test(month)) notFound();
  const { songs, total } = await songsOfMonth(Number(year), month, 1);
  if (songs.length === 0) notFound();
  const source = `years/${year}/${month}`;
  const playlist = await playlistOfMonth(Number(year), month);
  const lang = await langOf(params);
  return (
    <>
      <div className="pt-4 pb-4 sm:pb-6">
        <Heading as="h1" size="page" eyebrow={year}>
          {TEXT[lang].title(year, Number(month))}
        </Heading>
        <PlayAll
          songs={playlist.songs}
          // 一覧の画面には全曲が並ぶので、曲数は全曲の数だけ（「100曲（全313曲）」だと100曲しか並んでいないように読めた）
          count={TERMS[lang].songs(formatCount(playlist.total))}
          source={source}
          pickup={playlist.pickup}
        />
      </div>
      <VirtualSongList source={source} page={1} songs={songs} total={total} />
    </>
  );
}
