import type { Metadata } from 'next';
import Image from 'next/image';
import { HopOnHover } from '@/components/hop-on-hover';
import { notFound } from 'next/navigation';
import { Heading } from '@/components/heading';
import { PickGroups } from '@/components/pick-groups';
import { PlayAll } from '@/components/play-all';
import { type DatedItem, findVoice } from '@/lib/catalog';
import { voiceArt } from '@/lib/voice-art';
import { voiceColor } from '@/lib/voice-color';
import { formatCount } from '@/lib/format';
import { yearOf } from '@/lib/iso-date';
import { langOf } from '@/i18n/config';
import { defineText } from '@/i18n/text';
import { voiceName } from '@/lib/voice-name';
import { voiceNamesFor } from '@/lib/voice-names';

const TEXT = defineText({
  ja: { picks: (shown: string, total: string) => `${shown}曲（全${total}曲）` },
  en: { picks: (shown: string, total: string) => `${shown} of ${total} songs` },
});

// 台帳は取り込みのときにしか変わらないので、時間では作り直さず、次の配備まで作ったページを使い回す（DB を起こさないため）。
// 歌声の画面はビルドのときには作らず、最初に開かれたときに作って残す
export const revalidate = false;

export function generateStaticParams() {
  return [];
}

export async function generateMetadata({
  params,
}: PageProps<'/[lang]/voices/[id]'>): Promise<Metadata> {
  const { id } = await params;
  const found = await findVoice(Number(id));
  if (!found || found.songs.length === 0) notFound();
  return { title: voiceName(found.voice.name, await voiceNamesFor(await langOf(params))) };
}

/**
 * その歌声（キャラ）の年ごとの代表曲。版の違い（V4X・Append など）はまとめる。
 * 全曲は並べない（多い歌声では誰も最後までたどらない）。曲を探すのは検索とボカロPの画面に任せる
 */
export default async function VoicePage({ params }: PageProps<'/[lang]/voices/[id]'>) {
  const { id } = await params;
  const found = await findVoice(Number(id));
  if (!found || found.songs.length === 0) notFound();
  const { voice, songs, yearTotals } = found;
  const byYear = Map.groupBy(songs, (s: DatedItem) => yearOf(s.publishedOn));
  const art = voiceArt(voice.id);
  const lang = await langOf(params);
  const t = TEXT[lang];
  return (
    <>
      <div className="flex items-end gap-4 pt-4 pb-4 sm:pb-6">
        {/* 絵の無い歌声には印を置かない。色の丸を置いていたが、ほとんどが色の表に無く、どれも同じ青緑で何も伝えなかった */}
        {art && (
          // キャラの色の丸の上に絵を載せ、丸からはみ出させる
          <span className="relative size-24 shrink-0 sm:size-32">
            <span
              aria-hidden
              className="absolute inset-x-voice-dot bottom-0 aspect-square rounded-full opacity-45"
              style={{ background: voiceColor(voice.name) }}
            />
            {/* 開いたときに1回跳ね、絵に指を乗せたときも跳ねる（札と同じ動き） */}
            <HopOnHover onArrive>
              <Image
                src={art}
                alt=""
                fill
                unoptimized
                priority
                className="object-contain object-bottom"
              />
            </HopOnHover>
          </span>
        )}
        <div>
          <Heading as="h1" size="page">
            {voiceName(voice.name, await voiceNamesFor(lang))}
          </Heading>
          {/* 流すのは代表曲だけ。全曲（1万曲を超える歌声もある）を年の新しい順に流すと、画面の見せ方と食い違う */}
          <PlayAll
            songs={songs}
            count={t.picks(formatCount(songs.length), formatCount(voice.songCount))}
            source={`voices/${voice.id}`}
          />
        </div>
      </div>
      <PickGroups
        groups={[...byYear].map(([year, list]) => ({
          key: year,
          label: year,
          songs: list,
          more: (yearTotals.get(year) ?? 0) > list.length ? `/voices/${voice.id}/${year}` : null,
        }))}
      />
    </>
  );
}
