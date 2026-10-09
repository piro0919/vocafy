import type { Metadata } from 'next';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { MoreLink } from '@/components/browse-cards';
import { Heading } from '@/components/heading';
import { SongList } from '@/components/song-list';
import { type DatedItem, findVoice } from '@/lib/catalog';
import { voiceArt } from '@/lib/voice-art';
import { voiceColor } from '@/lib/voice-color';

// 台帳は取り込みのときにしか変わらないので、時間では作り直さず、次の配備まで作ったページを使い回す（DB を起こさないため）。
// 歌声の画面はビルドのときには作らず、最初に開かれたときに作って残す
export const revalidate = false;

export function generateStaticParams() {
  return [];
}

export async function generateMetadata({ params }: PageProps<'/voices/[id]'>): Promise<Metadata> {
  const { id } = await params;
  const found = await findVoice(Number(id));
  return { title: found?.voice.name };
}

/**
 * その歌声（キャラ）の年ごとの代表曲。版の違い（V4X・Append など）はまとめる。
 * 全曲は並べない（多い歌声では誰も最後までたどらない）。曲を探すのは検索とボカロPの画面に任せる
 */
export default async function VoicePage({ params }: PageProps<'/voices/[id]'>) {
  const { id } = await params;
  const found = await findVoice(Number(id));
  if (!found || found.songs.length === 0) notFound();
  const { voice, songs, yearTotals } = found;
  const byYear = Map.groupBy(songs, (s: DatedItem) => s.publishedOn.slice(0, 4));
  const art = voiceArt(voice.id);
  return (
    <>
      <div className="flex items-end gap-4 pt-4 pb-4 sm:pb-6">
        {/* 絵の無い歌声には印を置かない。色の丸を置いていたが、ほとんどが色の表に無く、どれも同じ青緑で何も伝えなかった */}
        {art && (
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
        )}
        <div>
          <Heading as="h1" size="page">
            {voice.name}
          </Heading>
          <p className="mt-2 text-sm text-muted">{voice.songCount} 曲</p>
        </div>
      </div>
      <div className="grid gap-6">
        {[...byYear].map(([year, list]) => (
          <section key={year}>
            {/* 代表曲に入りきらない年だけ、その年の全曲へ行けるようにする */}
            <div className="mb-2 flex items-center gap-3">
              <h2 className="font-tech text-sm font-black tracking-[0.2em] text-accent">{year}</h2>
              {(yearTotals.get(year) ?? 0) > list.length && (
                <div className="ml-auto">
                  <MoreLink href={`/voices/${voice.id}/${year}`} />
                </div>
              )}
            </div>
            <SongList songs={list} className="grid gap-1 md:grid-cols-2 xl:grid-cols-3" />
          </section>
        ))}
      </div>
    </>
  );
}
