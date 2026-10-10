import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Heading } from '@/components/heading';
import { pageOf } from '@/components/pager';
import { PlayAll } from '@/components/play-all';
import { VirtualSongList } from '@/components/virtual-song-list';
import { playlistOfVoiceYear, songsOfVoiceYear, voices } from '@/lib/catalog';
import { formatCount } from '@/lib/format';

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
}: PageProps<'/voices/[id]/[year]/[[...page]]'>): Promise<Metadata> {
  const { id, year, page } = await params;
  const voice = await voiceOf(id);
  const n = pageOf(page);
  return {
    title: voice && `${voice.name}の${year}年の曲${n && n > 1 ? `（${n}ページ目）` : ''}`,
  };
}

/** その歌声（キャラ）のその年の曲。歌声の画面の年の「すべて表示」から。多い年もページに分けず、スクロールで続きを出す（VirtualSongList） */
export default async function VoiceYearPage({
  params,
}: PageProps<'/voices/[id]/[year]/[[...page]]'>) {
  const { id, year, page: segments } = await params;
  const page = pageOf(segments);
  const voice = await voiceOf(id);
  if (!page || !voice || !/^\d{4}$/.test(year)) notFound();
  const { songs, total } = await songsOfVoiceYear(voice.id, Number(year), page);
  if (songs.length === 0) notFound();
  const playlist = await playlistOfVoiceYear(voice.id, Number(year));
  return (
    <>
      <div className="pt-4 pb-4 sm:pb-6">
        <Heading as="h1" size="page" eyebrow={year}>
          {voice.name}の{year}年の曲
        </Heading>
        <PlayAll
          songs={playlist.songs}
          // 一覧の画面には全曲が並ぶので、曲数は全曲の数だけ（「100曲（全313曲）」だと100曲しか並んでいないように読めた）
          count={`${formatCount(playlist.total)}曲`}
          list={{ source: `voices/${voice.id}/${year}`, page: 1, last: 1 }}
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
