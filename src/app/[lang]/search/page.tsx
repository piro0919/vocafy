import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Heading } from '@/components/heading';
import { langOf } from '@/i18n/config';
import { TERMS } from '@/i18n/terms';
import { SearchView } from './search-view';

export async function generateMetadata({ params }: PageProps<'/[lang]/search'>): Promise<Metadata> {
  return { title: TERMS[await langOf(params)].search };
}

/**
 * 曲名とボカロP名で探す画面。中身はブラウザの側で探すので、この画面そのものは作り置きの殻だけ。
 * 探す言葉は住所の ?q= に持ち、共有や戻るで同じ結果に戻れるようにする
 */
export default async function SearchPage({ params }: PageProps<'/[lang]/search'>) {
  const t = TERMS[await langOf(params)];
  return (
    <div className="pt-4">
      {/* スマホは上の帯が検索欄になり、何の画面か分かるので題名を出さない（YouTube のアプリと同じ） */}
      <div className="hidden md:block">
        <Heading as="h1" size="page" eyebrow="Search">
          {t.search}
        </Heading>
      </div>
      <Suspense>
        <SearchView />
      </Suspense>
    </div>
  );
}
