import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Heading } from '@/components/heading';
import { SearchView } from './search-view';

export const metadata: Metadata = { title: '検索' };

/**
 * 曲名とボカロP名で探す画面。中身はブラウザの側で探すので、この画面そのものは作り置きの殻だけ。
 * 探す言葉は住所の ?q= に持ち、共有や戻るで同じ結果に戻れるようにする
 */
export default function SearchPage() {
  return (
    <div className="pt-4">
      {/* スマホは上の帯が検索欄になり、何の画面か分かるので題名を出さない（YouTube のアプリと同じ） */}
      <div className="hidden md:block">
        <Heading as="h1" size="page" eyebrow="Search">
          検索
        </Heading>
      </div>
      <Suspense>
        <SearchView />
      </Suspense>
    </div>
  );
}
