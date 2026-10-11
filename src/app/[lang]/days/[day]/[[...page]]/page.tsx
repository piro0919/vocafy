import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Heading, YEAR_HEADING } from '@/components/heading';
import { Pager, pageOf } from '@/components/pager';
import { PlayAll } from '@/components/play-all';
import { SongList } from '@/components/song-list';
import { type DatedItem, playlistOfDay, songsOfDay } from '@/lib/catalog';
import { dayTitle } from '@/lib/list-titles';
import { langOf } from '@/i18n/config';
import { defineText } from '@/i18n/text';
import { TERMS } from '@/i18n/terms';
import { formatCount } from '@/lib/format';
import { yearOf } from '@/lib/iso-date';

const TEXT = defineText({
  ja: { page: (n: number) => `（${n}ページ目）` },
  en: { page: (n: number) => ` (page ${n})` },
});

// 流す曲（全曲から選ぶピックアップ）を日ごとに選び直すので、1日ごとに作り直す（catalog.ts の Playlist）。
// 作り直すのは開かれたページだけで、DB を起こすのはその日の1回目だけ
export const revalidate = 86400;

export function generateStaticParams() {
  return [];
}

export async function generateMetadata({
  params,
}: PageProps<'/[lang]/days/[day]/[[...page]]'>): Promise<Metadata> {
  const { day, page } = await params;
  const n = pageOf(page);
  if (!n || (await songsOfDay(day, n)).songs.length === 0) notFound();
  const lang = await langOf(params);
  return { title: `${dayTitle(day, lang)}${n > 1 ? TEXT[lang].page(n) : ''}` };
}

/**
 * その月日に投稿された曲。トップからはリンクしていない（トップの欄は横に送れば全曲をたどれ、「再生」は再生用の画面へ移る）。
 * 住所を直接開いたときのために残している。
 * 何年の曲かが要なので、年ごとに区切って新しい年から並べる。多い日は PAGE_SIZE 曲ずつのページに分ける
 */
export default async function DayPage({ params }: PageProps<'/[lang]/days/[day]/[[...page]]'>) {
  const { day, page: segments } = await params;
  const page = pageOf(segments);
  if (!page) notFound();
  const { songs, total } = await songsOfDay(day, page);
  if (songs.length === 0) notFound();
  const playlist = await playlistOfDay(day);
  const lang = await langOf(params);
  const byYear = Map.groupBy(songs, (s: DatedItem) => yearOf(s.publishedOn));
  return (
    <>
      <div className="pt-4 pb-4 sm:pb-6">
        <Heading as="h1" size="page" eyebrow="On This Day">
          {dayTitle(day, lang)}
        </Heading>
        <PlayAll
          songs={playlist.songs}
          // 一覧の画面には全曲が並ぶので、曲数は全曲の数だけ（「100曲（全313曲）」だと100曲しか並んでいないように読めた）
          count={TERMS[lang].songs(formatCount(playlist.total))}
          source={`days/${day}`}
          pickup={playlist.pickup}
        />
      </div>
      <div className="grid gap-6">
        {[...byYear].map(([year, list]) => (
          <section key={year}>
            <h2 className={`mb-2 ${YEAR_HEADING}`}>{year}</h2>
            <SongList songs={list} className="grid gap-1 md:grid-cols-2 xl:grid-cols-3" />
          </section>
        ))}
      </div>
      <Pager base={`/days/${day}`} page={page} total={total} lang={lang} />
    </>
  );
}
