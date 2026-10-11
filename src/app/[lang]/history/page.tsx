import type { Metadata } from 'next';
import { Heading } from '@/components/heading';
import { langOf } from '@/i18n/config';
import { TERMS } from '@/i18n/terms';
import { HistoryView } from './history-view';

export async function generateMetadata({
  params,
}: PageProps<'/[lang]/history'>): Promise<Metadata> {
  return { title: TERMS[await langOf(params)].history, robots: { index: false } };
}

/**
 * 最近聴いた曲（視聴履歴）。中身はこのブラウザに残したもの（src/lib/history.ts）なので、この画面そのものは作り置きの殻だけ。
 * 入り口は、パソコンは左のメニュー、スマホはお気に入りの画面の題名の横（下のタブは5つで埋まっているため）
 */
export default async function HistoryPage({ params }: PageProps<'/[lang]/history'>) {
  const t = TERMS[await langOf(params)];
  return (
    <>
      <div className="pt-4 pb-4 sm:pb-6">
        <Heading as="h1" size="page" eyebrow="History">
          {t.history}
        </Heading>
      </div>
      <HistoryView />
    </>
  );
}
