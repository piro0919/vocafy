import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Heading } from '@/components/heading';
import { ListPlayer } from '@/components/list-player';
import { songsOfVoiceYear, voices } from '@/lib/catalog';

// 一覧の画面と同じく、次の配備まで作ったページを使い回す。ビルドのときには作らず、最初に開かれたときに作る
export const revalidate = false;

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
  const { songs, total } = await songsOfVoiceYear(voice.id, Number(year), 1);
  if (songs.length === 0) notFound();
  return (
    <div className="pt-4">
      <ListPlayer
        source={`voices/${voice.id}/${year}`}
        songs={songs}
        total={total}
        heading={
          <Heading as="h1" size="page" eyebrow={year}>
            {voice.name}の{year}年の曲
          </Heading>
        }
      />
    </div>
  );
}
