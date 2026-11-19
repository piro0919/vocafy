import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ListPlayer } from '@/components/list-player';
import { playlistOfDay } from '@/lib/catalog';
import { dayTitle, withPickup } from '@/lib/list-titles';
import { langOf } from '@/i18n/config';

// 時間では作り直さず、最初に開かれたときに作って次の配備まで残す（DB を起こさないため）。流す曲（ピックアップ）も配備ごとに選ぶ（catalog.ts の pickupSeed）。
// 1日ごとに作り直していたころは、Neon の無料の計算時間を使い切りかけた（2026-11-19）
export const revalidate = false;

export function generateStaticParams() {
  return [];
}

export async function generateMetadata({
  params,
}: PageProps<'/[lang]/days/[day]/play'>): Promise<Metadata> {
  const { day } = await params;
  if ((await playlistOfDay(day)).songs.length === 0) notFound();
  return { title: dayTitle(day, await langOf(params)), robots: { index: false } };
}

/** その月日に投稿された曲の再生用の画面（list-player.tsx）。日付の画面の「すべて再生」から */
export default async function DayPlayPage({ params }: PageProps<'/[lang]/days/[day]/play'>) {
  const { day } = await params;
  const lang = await langOf(params);
  const playlist = await playlistOfDay(day);
  if (playlist.songs.length === 0) notFound();
  return (
    <div className="pt-content-top">
      <ListPlayer
        source={`days/${day}`}
        songs={playlist.songs}
        // 全曲から選んだ100曲を流すときは、小さな英字に PICKUP を添える（「2026 PICKUP」。2026-10-11 に本人と決めた）
        eyebrow={withPickup('On This Day', playlist.pickup)}
        title={dayTitle(day, lang)}
      />
    </div>
  );
}
