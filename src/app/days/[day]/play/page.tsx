import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Heading } from '@/components/heading';
import { ListPlayer } from '@/components/list-player';
import { songsOfDay } from '@/lib/catalog';
import { dayLabel } from '@/lib/list-titles';

// 一覧の画面と同じく、次の配備まで作ったページを使い回す。ビルドのときには作らず、最初に開かれたときに作る
export const revalidate = false;

export function generateStaticParams() {
  return [];
}

export async function generateMetadata({
  params,
}: PageProps<'/days/[day]/play'>): Promise<Metadata> {
  const { day } = await params;
  return { title: `${dayLabel(day)}に生まれた曲`, robots: { index: false } };
}

/** その月日に投稿された曲の再生用の画面（list-player.tsx）。日付の画面の「すべて再生」から */
export default async function DayPlayPage({ params }: PageProps<'/days/[day]/play'>) {
  const { day } = await params;
  const { songs, total } = await songsOfDay(day, 1);
  if (songs.length === 0) notFound();
  return (
    <div className="pt-4">
      <ListPlayer
        source={`days/${day}`}
        songs={songs}
        total={total}
        heading={
          <Heading as="h1" size="page" eyebrow="On This Day">
            {dayLabel(day)}に生まれた曲
          </Heading>
        }
      />
    </div>
  );
}
