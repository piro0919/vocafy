import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Heading } from '@/components/heading';
import { Pager, pageOf } from '@/components/pager';
import { SongList } from '@/components/song-list';
import { type DatedItem, songsOfDay } from '@/lib/catalog';

// 台帳は取り込みのときにしか変わらないので、時間では作り直さず、次の配備まで作ったページを使い回す（DB を起こさないため）。
// 日付の画面はビルドのときには作らず、最初に開かれたときに作って残す
export const revalidate = false;

export function generateStaticParams() {
  return [];
}

/** 「10-09」→「10月9日」 */
function label(day: string): string {
  const [m, d] = day.split('-').map(Number);
  return `${m}月${d}日`;
}

export async function generateMetadata({
  params,
}: PageProps<'/days/[day]/[[...page]]'>): Promise<Metadata> {
  const { day, page } = await params;
  const n = pageOf(page);
  return { title: `${label(day)}に生まれた曲${n && n > 1 ? `（${n}ページ目）` : ''}` };
}

/**
 * その月日に投稿された曲。トップの「きょうの日付の曲」に入りきらない分も、ここで全部見られる。
 * 何年の曲かが要なので、年ごとに区切って新しい年から並べる。多い日は PAGE_SIZE 曲ずつのページに分ける
 */
export default async function DayPage({ params }: PageProps<'/days/[day]/[[...page]]'>) {
  const { day, page: segments } = await params;
  const page = pageOf(segments);
  if (!page) notFound();
  const { songs, total } = await songsOfDay(day, page);
  if (songs.length === 0) notFound();
  const byYear = Map.groupBy(songs, (s: DatedItem) => s.publishedOn.slice(0, 4));
  return (
    <>
      <div className="pt-4 pb-4 sm:pb-6">
        <Heading as="h1" size="page" eyebrow="On This Day">
          {label(day)}に生まれた曲
        </Heading>
        <p className="mt-2 text-sm text-muted">{total} 曲</p>
      </div>
      <div className="grid gap-6">
        {[...byYear].map(([year, list]) => (
          <section key={year}>
            <h2 className="mb-2 font-tech text-sm font-black tracking-[0.2em] text-accent">
              {year}
            </h2>
            <SongList songs={list} className="grid gap-1 md:grid-cols-2 xl:grid-cols-3" />
          </section>
        ))}
      </div>
      <Pager base={`/days/${day}`} page={page} total={total} />
    </>
  );
}
