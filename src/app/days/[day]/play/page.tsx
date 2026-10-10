import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ListPlayer } from '@/components/list-player';
import { playlistOfDay } from '@/lib/catalog';
import { dayLabel, withPickup } from '@/lib/list-titles';

// 流す曲（全曲から選ぶピックアップ）を日ごとに選び直すので、1日ごとに作り直す（catalog.ts の Playlist）。
// 作り直すのは開かれたページだけで、DB を起こすのはその日の1回目だけ
export const revalidate = 86400;

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
  const playlist = await playlistOfDay(day);
  if (playlist.songs.length === 0) notFound();
  return (
    <div className="pt-4">
      <ListPlayer
        source={`days/${day}`}
        songs={playlist.songs}
        // 全曲から選んだ100曲を流すときは、小さな英字に PICKUP を添える（「2026 PICKUP」。2026-10-11 に本人と決めた）
        eyebrow={withPickup('On This Day', playlist.pickup)}
        title={`${dayLabel(day)}に生まれた曲`}
      />
    </div>
  );
}
