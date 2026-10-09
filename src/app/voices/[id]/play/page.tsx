import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Heading } from '@/components/heading';
import { ListPlayer } from '@/components/list-player';
import { findVoice } from '@/lib/catalog';

// 一覧の画面と同じく、次の配備まで作ったページを使い回す。ビルドのときには作らず、最初に開かれたときに作る
export const revalidate = false;

export function generateStaticParams() {
  return [];
}

export async function generateMetadata({
  params,
}: PageProps<'/voices/[id]/play'>): Promise<Metadata> {
  const found = await findVoice(Number((await params).id));
  return { title: found && `${found.voice.name}の代表曲`, robots: { index: false } };
}

/**
 * 歌声（キャラ）の代表曲（年ごとに数曲）の再生用の画面（list-player.tsx）。歌声の画面の「再生」から。
 * 全曲（1万曲を超える歌声もある）は流さず、歌声の画面に並べている代表曲だけを流す
 */
export default async function VoicePlayPage({ params }: PageProps<'/voices/[id]/play'>) {
  const found = await findVoice(Number((await params).id));
  if (!found || found.songs.length === 0) notFound();
  const { voice, songs } = found;
  return (
    <div className="pt-4">
      <ListPlayer
        source={`voices/${voice.id}`}
        songs={songs}
        total={songs.length}
        heading={
          <Heading as="h1" size="page" eyebrow="Voice">
            {voice.name}の代表曲
          </Heading>
        }
      />
    </div>
  );
}
