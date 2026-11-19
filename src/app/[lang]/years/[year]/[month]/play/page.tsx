import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ListPlayer } from '@/components/list-player';
import { monthTitle, withPickup } from '@/lib/list-titles';
import { MONTH, playlistOfMonth } from '@/lib/catalog';
import { langOf } from '@/i18n/config';

// 時間では作り直さず、最初に開かれたときに作って次の配備まで残す（DB を起こさないため）。流す曲（ピックアップ）も配備ごとに選ぶ（catalog.ts の pickupSeed）。
// 1日ごとに作り直していたころは、Neon の無料の計算時間を使い切りかけた（2026-11-19）
export const revalidate = false;

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
