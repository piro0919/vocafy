import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Heading } from '@/components/heading';
import { pageOf } from '@/components/pager';
import { PlayAll } from '@/components/play-all';
import { VirtualSongList } from '@/components/virtual-song-list';
import { playlistOfVoiceYear, songsOfVoiceYear, voices } from '@/lib/catalog';
import { formatCount } from '@/lib/format';
import { langOf } from '@/i18n/config';
import { defineText } from '@/i18n/text';
import { TERMS } from '@/i18n/terms';
import { voiceName } from '@/lib/voice-name';
import { voiceNamesFor } from '@/lib/voice-names';

const TEXT = defineText({
  ja: {
    title: (name: string, year: string) => `${name}の${year}年の曲`,
    page: (n: number) => `（${n}ページ目）`,
  },
  en: {
    title: (name: string, year: string) => `${name} in ${year}`,
    page: (n: number) => ` (page ${n})`,
  },
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
}: PageProps<'/[lang]/voices/[id]/[year]/[[...page]]'>): Promise<Metadata> {
  const { id, year, page } = await params;
  const voice = await voiceOf(id);
  const n = pageOf(page);
  if (!n || !voice || !/^\d{4}$/.test(year)) notFound();
  if ((await songsOfVoiceYear(voice.id, Number(year), n)).songs.length === 0) notFound();
  const lang = await langOf(params);
  const t = TEXT[lang];
  return {
    title: `${t.title(voiceName(voice.name, await voiceNamesFor(lang)), year)}${n && n > 1 ? t.page(n) : ''}`,
  };
}

/** その歌声（キャラ）のその年の曲。歌声の画面の年の「すべて表示」から。多い年もページに分けず、スクロールで続きを出す（VirtualSongList） */
export default async function VoiceYearPage({
  params,
}: PageProps<'/[lang]/voices/[id]/[year]/[[...page]]'>) {
  const { id, year, page: segments } = await params;
  const page = pageOf(segments);
  const voice = await voiceOf(id);
  if (!page || !voice || !/^\d{4}$/.test(year)) notFound();
  const { songs, total } = await songsOfVoiceYear(voice.id, Number(year), page);
  if (songs.length === 0) notFound();
  const playlist = await playlistOfVoiceYear(voice.id, Number(year));
  const lang = await langOf(params);
  return (
    <>
      <div className="pt-4 pb-4 sm:pb-6">
        <Heading as="h1" size="page" eyebrow={year}>
          {TEXT[lang].title(voiceName(voice.name, await voiceNamesFor(lang)), year)}
        </Heading>
        <PlayAll
          songs={playlist.songs}
          // 一覧の画面には全曲が並ぶので、曲数は全曲の数だけ（「100曲（全313曲）」だと100曲しか並んでいないように読めた）
          count={TERMS[lang].songs(formatCount(playlist.total))}
          source={`voices/${voice.id}/${year}`}
          pickup={playlist.pickup}
        />
      </div>
      <VirtualSongList
        source={`voices/${voice.id}/${year}`}
        page={page}
        songs={songs}
        total={total}
      />
    </>
  );
}
