import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ListPlayer } from '@/components/list-player';
import { withPickup } from '@/lib/list-titles';
import { playlistOfVoiceYear, voices } from '@/lib/catalog';
import { langOf } from '@/i18n/config';
import { defineText } from '@/i18n/text';
import { voiceName } from '@/lib/voice-name';

const TEXT = defineText({
  ja: { title: (name: string, year: string) => `${name}の${year}年の曲` },
  en: { title: (name: string, year: string) => `${name} in ${year}` },
});

// 流す曲（全曲から選ぶピックアップ）を日ごとに選び直すので、1日ごとに作り直す（catalog.ts の Playlist）。
// 作り直すのは開かれたページだけで、DB を起こすのはその日の1回目だけ
export const revalidate = 86400;

export function generateStaticParams() {
  return [];
}

async function voiceOf(id: string) {
  return (await voices()).find((v) => v.id === Number(id));
}

export async function generateMetadata({
  params,
}: PageProps<'/[lang]/voices/[id]/[year]/play'>): Promise<Metadata> {
  const { id, year } = await params;
  const voice = await voiceOf(id);
  const lang = await langOf(params);
  const t = TEXT[lang];
  return { title: voice && t.title(voiceName(voice.name, lang), year), robots: { index: false } };
}

/** その歌声（キャラ）のその年の曲の再生用の画面（list-player.tsx）。歌声の年の画面の「すべて再生」から */
export default async function VoiceYearPlayPage({
  params,
}: PageProps<'/[lang]/voices/[id]/[year]/play'>) {
  const { id, year } = await params;
  const voice = await voiceOf(id);
  if (!voice || !/^\d{4}$/.test(year)) notFound();
  const playlist = await playlistOfVoiceYear(voice.id, Number(year));
  if (playlist.songs.length === 0) notFound();
  const lang = await langOf(params);
  const t = TEXT[lang];
  return (
    <div className="pt-content-top">
      <ListPlayer
        source={`voices/${voice.id}/${year}`}
        songs={playlist.songs}
        // 全曲から選んだ100曲を流すときは、小さな英字に PICKUP を添える（「2026 PICKUP」。2026-10-11 に本人と決めた）
        eyebrow={withPickup(String(year), playlist.pickup)}
        title={t.title(voiceName(voice.name, lang), year)}
      />
    </div>
  );
}
