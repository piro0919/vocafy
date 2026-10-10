import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ListPlayer } from '@/components/list-player';
import { MONTH, songsOfMonth } from '@/lib/catalog';

// 一覧の画面と同じく、次の配備まで作ったページを使い回す。ビルドのときには作らず、最初に開かれたときに作る
export const revalidate = false;

export function generateStaticParams() {
  return [];
}

export async function generateMetadata({
  params,
}: PageProps<'/years/[year]/[month]/play'>): Promise<Metadata> {
  const { year, month } = await params;
  return { title: `${year}年${Number(month)}月の曲`, robots: { index: false } };
}

/** その年のその月の曲の再生用の画面（list-player.tsx）。月の画面の「再生」から */
export default async function MonthPlayPage({ params }: PageProps<'/years/[year]/[month]/play'>) {
  const { year, month } = await params;
  if (!/^\d{4}$/.test(year) || !MONTH.test(month)) notFound();
  const { songs, total } = await songsOfMonth(Number(year), month, 1);
  if (songs.length === 0) notFound();
  return (
    <div className="pt-4">
      <ListPlayer
        source={`years/${year}/${month}`}
        songs={songs}
        total={total}
        eyebrow={String(year)}
        title={`${year}年${Number(month)}月の曲`}
      />
    </div>
  );
}
