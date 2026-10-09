import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { MoreLink } from '@/components/browse-cards';
import { Heading, YEAR_HEADING } from '@/components/heading';
import { PlayAll } from '@/components/play-all';
import { SongList } from '@/components/song-list';
import { type DatedItem, picksOfYear } from '@/lib/catalog';
import { formatCount } from '@/lib/format';

// 台帳は取り込みのときにしか変わらないので、時間では作り直さず、次の配備まで作ったページを使い回す（DB を起こさないため）。
// 年の画面はビルドのときには作らず、最初に開かれたときに作って残す
export const revalidate = false;

export function generateStaticParams() {
  return [];
}

export async function generateMetadata({ params }: PageProps<'/years/[year]'>): Promise<Metadata> {
  const { year } = await params;
  return { title: `${year}年の曲` };
}

/**
 * その年の月ごとの代表曲（catalog.ts の picksOfYear）。歌声の画面と同じ形で、区切りが年でなく月。
 * 月の全曲は、月の見出しの横の「すべて表示」から
 */
export default async function YearPage({ params }: PageProps<'/years/[year]'>) {
  const { year } = await params;
  if (!/^\d{4}$/.test(year)) notFound();
  const { songs, monthTotals } = await picksOfYear(Number(year));
  if (songs.length === 0) notFound();
  const byMonth = Map.groupBy(songs, (s: DatedItem) => s.publishedOn.slice(5, 7));
  const total = [...monthTotals.values()].reduce((a, b) => a + b, 0);
  return (
    <>
      <div className="pt-4 pb-4 sm:pb-6">
        <Heading as="h1" size="page" eyebrow={year}>
          {year}年の曲
        </Heading>
        {/* 流すのは代表曲だけ（歌声の画面と同じ） */}
        <PlayAll
          songs={songs}
          count={`${songs.length}曲（全${formatCount(total)}曲）`}
          list={{ source: `years/${year}`, page: 1, last: 1 }}
        />
      </div>
      <div className="grid gap-6">
        {[...byMonth].map(([month, list]) => (
          <section key={month}>
            {/* 代表曲に入りきらない月だけ、その月の全曲へ行けるようにする */}
            <div className="mb-2 flex items-center gap-3">
              <h2 className={YEAR_HEADING}>{Number(month)}月</h2>
              {(monthTotals.get(month) ?? 0) > list.length && (
                <div className="ml-auto">
                  <MoreLink href={`/years/${year}/${month}`} />
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
