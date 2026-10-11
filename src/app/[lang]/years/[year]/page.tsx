import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Heading } from '@/components/heading';
import { PickGroups } from '@/components/pick-groups';
import { PlayAll } from '@/components/play-all';
import { type DatedItem, picksOfYear } from '@/lib/catalog';
import { formatCount } from '@/lib/format';
import { monthOf } from '@/lib/iso-date';
import { langOf } from '@/i18n/config';
import { defineText } from '@/i18n/text';

/** 英語の月の名前（「March」） */
const EN_MONTH = new Intl.DateTimeFormat('en', { month: 'long', timeZone: 'UTC' });

const TEXT = defineText({
  ja: {
    title: (year: string) => `${year}年の曲`,
    picks: (shown: string, total: string) => `${shown}曲（全${total}曲）`,
    month: (month: number) => `${month}月`,
  },
  en: {
    title: (year: string) => `Songs from ${year}`,
    picks: (shown: string, total: string) => `${shown} of ${total} songs`,
    month: (month: number) => EN_MONTH.format(new Date(Date.UTC(0, month - 1))),
  },
});

// 台帳は取り込みのときにしか変わらないので、時間では作り直さず、次の配備まで作ったページを使い回す（DB を起こさないため）。
// 年の画面はビルドのときには作らず、最初に開かれたときに作って残す
export const revalidate = false;

export function generateStaticParams() {
  return [];
}

export async function generateMetadata({
  params,
}: PageProps<'/[lang]/years/[year]'>): Promise<Metadata> {
  const { year } = await params;
  // 無い年は、題名を作る前に見つからない画面にする（題名を作ると、見つからない画面のタブにその題名が出た）
  if (!/^\d{4}$/.test(year) || (await picksOfYear(Number(year))).songs.length === 0) notFound();
  return { title: TEXT[await langOf(params)].title(year) };
}

/**
 * その年の月ごとの代表曲（catalog.ts の picksOfYear）。歌声の画面と同じ形で、区切りが年でなく月。
 * 月の全曲は、月の見出しの横の「すべて表示」から
 */
export default async function YearPage({ params }: PageProps<'/[lang]/years/[year]'>) {
  const { year } = await params;
  if (!/^\d{4}$/.test(year)) notFound();
  const { songs, monthTotals } = await picksOfYear(Number(year));
  if (songs.length === 0) notFound();
  const byMonth = Map.groupBy(songs, (s: DatedItem) => monthOf(s.publishedOn));
  const total = [...monthTotals.values()].reduce((a, b) => a + b, 0);
  const t = TEXT[await langOf(params)];
  return (
    <>
      <div className="pt-4 pb-4 sm:pb-6">
        <Heading as="h1" size="page" eyebrow={year}>
          {t.title(year)}
        </Heading>
        {/* 流すのは代表曲だけ（歌声の画面と同じ） */}
        <PlayAll
          songs={songs}
          count={t.picks(formatCount(songs.length), formatCount(total))}
          source={`years/${year}`}
        />
      </div>
      <PickGroups
        groups={[...byMonth].map(([month, list]) => ({
          key: month,
          label: t.month(Number(month)),
          songs: list,
          more: (monthTotals.get(month) ?? 0) > list.length ? `/years/${year}/${month}` : null,
        }))}
      />
    </>
  );
}
