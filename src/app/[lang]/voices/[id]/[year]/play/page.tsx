import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ListPlayer } from '@/components/list-player';
import { voiceYearTitle, withPickup } from '@/lib/list-titles';
import { playlistOfVoiceYear, voiceById } from '@/lib/catalog';
import { langOf } from '@/i18n/config';
import { voiceName } from '@/lib/voice-name';
import { voiceNamesFor } from '@/lib/voice-names';

// 時間では作り直さず、最初に開かれたときに作って次の配備まで残す（DB を起こさないため）。流す曲（ピックアップ）も配備ごとに選ぶ（catalog.ts の pickupSeed）。
// 1日ごとに作り直していたころは、Neon の無料の計算時間を使い切りかけた（2026-11-19）
export const revalidate = false;

export function generateStaticParams() {
  return [];
}

export async function generateMetadata({
  params,
}: PageProps<'/[lang]/voices/[id]/[year]/play'>): Promise<Metadata> {
  const { id, year } = await params;
  const voice = await voiceById(Number(id));
  if (!voice || !/^\d{4}$/.test(year)) notFound();
  if ((await playlistOfVoiceYear(voice.id, Number(year))).songs.length === 0) notFound();
  const lang = await langOf(params);
  return {
    title: voiceYearTitle(voiceName(voice.name, await voiceNamesFor(lang)), year, lang),
    robots: { index: false },
  };
}

/** その歌声（キャラ）のその年の曲の再生用の画面（list-player.tsx）。歌声の年の画面の「すべて再生」から */
export default async function VoiceYearPlayPage({
  params,
}: PageProps<'/[lang]/voices/[id]/[year]/play'>) {
  const { id, year } = await params;
  const voice = await voiceById(Number(id));
  if (!voice || !/^\d{4}$/.test(year)) notFound();
  const playlist = await playlistOfVoiceYear(voice.id, Number(year));
  if (playlist.songs.length === 0) notFound();
  const lang = await langOf(params);
  return (
    <div className="pt-content-top">
      <ListPlayer
        source={`voices/${voice.id}/${year}`}
        songs={playlist.songs}
        // 全曲から選んだ100曲を流すときは、小さな英字に PICKUP を添える（「2026 PICKUP」。2026-10-11 に本人と決めた）
        eyebrow={withPickup(String(year), playlist.pickup)}
        title={voiceYearTitle(voiceName(voice.name, await voiceNamesFor(lang)), year, lang)}
      />
    </div>
  );
}
