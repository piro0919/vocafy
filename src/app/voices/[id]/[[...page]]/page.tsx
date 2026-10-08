import type { Metadata } from 'next';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { Heading } from '@/components/heading';
import { Pager, pageOf } from '@/components/pager';
import { SongList } from '@/components/song-list';
import { findVoice } from '@/lib/catalog';
import { voiceArt } from '@/lib/voice-art';
import { voiceColor } from '@/lib/voice-color';

// 台帳は取り込みのときにしか変わらないので、時間では作り直さず、次の配備まで作ったページを使い回す（DB を起こさないため）。
// 歌声の画面はビルドのときには作らず、最初に開かれたときに作って残す
export const revalidate = false;

export function generateStaticParams() {
  return [];
}

export async function generateMetadata({
  params,
}: PageProps<'/voices/[id]/[[...page]]'>): Promise<Metadata> {
  const { id, page } = await params;
  const n = pageOf(page);
  const found = n ? await findVoice(Number(id), n) : undefined;
  return { title: found && `${found.voice.name}${n && n > 1 ? `（${n}ページ目）` : ''}` };
}

/** その歌声（キャラ）が歌っている曲。版の違い（V4X・Append など）はまとめる。多い歌声は PAGE_SIZE 曲ずつのページに分ける */
export default async function VoicePage({ params }: PageProps<'/voices/[id]/[[...page]]'>) {
  const { id, page: segments } = await params;
  const page = pageOf(segments);
  if (!page) notFound();
  const found = await findVoice(Number(id), page);
  if (!found || found.songs.length === 0) notFound();
  const { voice, songs, total } = found;
  const art = voiceArt(voice.id);
  return (
    <>
      <div className="flex items-end gap-4 pt-4 pb-4 sm:pb-6">
        {art ? (
          // キャラの色の丸の上に絵を載せ、丸からはみ出させる
          <span className="relative size-24 shrink-0 sm:size-32">
            <span
              aria-hidden
              className="absolute inset-x-[6%] bottom-0 aspect-square rounded-full opacity-45"
              style={{ background: voiceColor(voice.name) }}
            />
            <Image
              src={art}
              alt=""
              fill
              unoptimized
              priority
              className="object-contain object-bottom"
            />
          </span>
        ) : (
          <span
            aria-hidden
            className="mb-1 size-10 shrink-0 rounded-full shadow-md sm:size-12"
            style={{ background: voiceColor(voice.name) }}
          />
        )}
        <div>
          <Heading as="h1" size="page" eyebrow="Voice">
            {voice.name}
          </Heading>
          <p className="mt-2 text-sm text-muted">{total} 曲</p>
        </div>
      </div>
      <SongList songs={songs} className="grid gap-1 md:grid-cols-2 xl:grid-cols-3" />
      <Pager base={`/voices/${voice.id}`} page={page} total={total} />
    </>
  );
}
