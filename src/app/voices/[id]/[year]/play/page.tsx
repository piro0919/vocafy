import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ListPlayer } from '@/components/list-player';
import { playlistOfVoiceYear, voices } from '@/lib/catalog';

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
}: PageProps<'/voices/[id]/[year]/play'>): Promise<Metadata> {
  const { id, year } = await params;
  const voice = await voiceOf(id);
  return { title: voice && `${voice.name}の${year}年の曲`, robots: { index: false } };
}

/** その歌声（キャラ）のその年の曲の再生用の画面（list-player.tsx）。歌声の年の画面の「すべて再生」から */
export default async function VoiceYearPlayPage({ params }: PageProps<'/voices/[id]/[year]/play'>) {
  const { id, year } = await params;
  const voice = await voiceOf(id);
  if (!voice || !/^\d{4}$/.test(year)) notFound();
  const playlist = await playlistOfVoiceYear(voice.id, Number(year));
  if (playlist.songs.length === 0) notFound();
  return (
    <div className="pt-4">
      <ListPlayer
        source={`voices/${voice.id}/${year}`}
        songs={playlist.songs}
        eyebrow={String(year)}
        title={`${voice.name}の${year}年の曲`}
      />
    </div>
  );
}
