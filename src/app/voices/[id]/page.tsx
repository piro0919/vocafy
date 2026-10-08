import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Heading } from '@/components/heading';
import { SongList } from '@/components/song-list';
import { findVoice } from '@/lib/catalog';
import { voiceColor } from '@/lib/voice-color';

// 台帳は取り込みのときにしか変わらないので、1時間は作ったページを使い回す。
// 歌声の画面はビルドのときには作らず、最初に開かれたときに作って残す
export const revalidate = 3600;

export function generateStaticParams() {
  return [];
}

export async function generateMetadata({ params }: PageProps<'/voices/[id]'>): Promise<Metadata> {
  const found = await findVoice(Number((await params).id));
  return { title: found?.voice.name };
}

/** その歌声（キャラ）が歌っている曲。版の違い（V4X・Append など）はまとめる */
export default async function VoicePage({ params }: PageProps<'/voices/[id]'>) {
  const found = await findVoice(Number((await params).id));
  if (!found) notFound();
  const { voice, songs } = found;
  return (
    <>
      <div className="flex items-end gap-4 pt-4 pb-4 sm:pb-6">
        <span
          aria-hidden
          className="mb-1 size-10 shrink-0 rounded-full shadow-md sm:size-12"
          style={{ background: voiceColor(voice.name) }}
        />
        <div>
          <Heading as="h1" size="page" eyebrow="Voice">
            {voice.name}
          </Heading>
          <p className="mt-2 text-sm text-muted">{songs.length} 曲</p>
        </div>
      </div>
      <SongList songs={songs} className="grid gap-1 md:grid-cols-2 xl:grid-cols-3" />
    </>
  );
}
