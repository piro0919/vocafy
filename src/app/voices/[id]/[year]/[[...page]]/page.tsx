import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Heading } from '@/components/heading';
import { pageOf } from '@/components/pager';
import { PlayAll } from '@/components/play-all';
import { VirtualSongList } from '@/components/virtual-song-list';
import { PAGE_SIZE, songsOfVoiceYear, voices } from '@/lib/catalog';
import { formatCount } from '@/lib/format';

// 台帳は取り込みのときにしか変わらないので、時間では作り直さず、次の配備まで作ったページを使い回す（DB を起こさないため）。
// ビルドのときには作らず、最初に開かれたときに作って残す
export const revalidate = false;

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
  return (
    <>
      <div className="pt-4 pb-4 sm:pb-6">
        <Heading as="h1" size="page" eyebrow={year}>
          {voice.name}の{year}年の曲
        </Heading>
        <PlayAll
          songs={songs}
          count={`${formatCount(total)} 曲`}
          list={{
            source: `voices/${voice.id}/${year}`,
            page,
            last: Math.ceil(total / PAGE_SIZE),
          }}
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
