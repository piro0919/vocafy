import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ListPlayer } from '@/components/list-player';
import { picksOfYear } from '@/lib/catalog';
import { langOf } from '@/i18n/config';
import { defineText } from '@/i18n/text';

const TEXT = defineText({
  ja: { title: (year: string) => `${year}年の代表曲` },
  en: { title: (year: string) => `Best of ${year}` },
});

// 一覧の画面と同じく、次の配備まで作ったページを使い回す。ビルドのときには作らず、最初に開かれたときに作る
export const revalidate = false;

export function generateStaticParams() {
  return [];
}

export async function generateMetadata({
  params,
}: PageProps<'/[lang]/years/[year]/play'>): Promise<Metadata> {
  const { year } = await params;
  return { title: TEXT[await langOf(params)].title(year), robots: { index: false } };
}

/** その年の月ごとの代表曲の再生用の画面（list-player.tsx）。年の画面の「再生」から。全曲は流さない */
export default async function YearPlayPage({ params }: PageProps<'/[lang]/years/[year]/play'>) {
  const { year } = await params;
  const t = TEXT[await langOf(params)];
  const { songs } = await picksOfYear(Number(year));
  if (songs.length === 0) notFound();
  return (
    <div className="pt-content-top">
      <ListPlayer
        source={`years/${year}`}
        songs={songs}
        eyebrow={String(year)}
        title={t.title(year)}
      />
    </div>
  );
}
