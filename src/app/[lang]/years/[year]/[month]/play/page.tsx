import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ListPlayer } from '@/components/list-player';
import { monthTitle, withPickup } from '@/lib/list-titles';
import { MONTH, playlistOfMonth } from '@/lib/catalog';
import { langOf } from '@/i18n/config';

// 流す曲（全曲から選ぶピックアップ）を日ごとに選び直すので、1日ごとに作り直す（catalog.ts の Playlist）。
// 作り直すのは開かれたページだけで、DB を起こすのはその日の1回目だけ
export const revalidate = 86400;

export function generateStaticParams() {
  return [];
}

export async function generateMetadata({
  params,
}: PageProps<'/[lang]/years/[year]/[month]/play'>): Promise<Metadata> {
  const { year, month } = await params;
  if (!/^\d{4}$/.test(year) || !MONTH.test(month)) notFound();
  if ((await playlistOfMonth(Number(year), month)).songs.length === 0) notFound();
  return { title: monthTitle(year, Number(month), await langOf(params)), robots: { index: false } };
}

/** その年のその月の曲の再生用の画面（list-player.tsx）。月の画面の「再生」から */
export default async function MonthPlayPage({
  params,
}: PageProps<'/[lang]/years/[year]/[month]/play'>) {
  const { year, month } = await params;
  if (!/^\d{4}$/.test(year) || !MONTH.test(month)) notFound();
  const playlist = await playlistOfMonth(Number(year), month);
  if (playlist.songs.length === 0) notFound();
  const lang = await langOf(params);
  return (
    <div className="pt-content-top">
      <ListPlayer
        source={`years/${year}/${month}`}
        songs={playlist.songs}
        // 全曲から選んだ100曲を流すときは、小さな英字に PICKUP を添える（「2026 PICKUP」。2026-10-11 に本人と決めた）
        eyebrow={withPickup(String(year), playlist.pickup)}
        title={monthTitle(year, Number(month), lang)}
      />
    </div>
  );
}
