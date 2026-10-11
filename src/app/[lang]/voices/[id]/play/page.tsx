import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ListPlayer } from '@/components/list-player';
import { findVoice } from '@/lib/catalog';
import { langOf } from '@/i18n/config';
import { defineText } from '@/i18n/text';
import { voiceName } from '@/lib/voice-name';

const TEXT = defineText({
  ja: { title: (name: string) => `${name}の代表曲` },
  en: { title: (name: string) => `Best of ${name}` },
});

// 一覧の画面と同じく、次の配備まで作ったページを使い回す。ビルドのときには作らず、最初に開かれたときに作る
export const revalidate = false;

export function generateStaticParams() {
  return [];
}

export async function generateMetadata({
  params,
}: PageProps<'/[lang]/voices/[id]/play'>): Promise<Metadata> {
  const found = await findVoice(Number((await params).id));
  const lang = await langOf(params);
  const t = TEXT[lang];
  return { title: found && t.title(voiceName(found.voice.name, lang)), robots: { index: false } };
}

/**
 * 歌声（キャラ）の代表曲（年ごとに数曲）の再生用の画面（list-player.tsx）。歌声の画面の「再生」から。
 * 全曲（1万曲を超える歌声もある）は流さず、歌声の画面に並べている代表曲だけを流す
 */
export default async function VoicePlayPage({ params }: PageProps<'/[lang]/voices/[id]/play'>) {
  const found = await findVoice(Number((await params).id));
  if (!found || found.songs.length === 0) notFound();
  const { voice, songs } = found;
  const lang = await langOf(params);
  const t = TEXT[lang];
  return (
    <div className="pt-content-top">
      <ListPlayer
        source={`voices/${voice.id}`}
        songs={songs}
        eyebrow="Voice"
        title={t.title(voiceName(voice.name, lang))}
      />
    </div>
  );
}
