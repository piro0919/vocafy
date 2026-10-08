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
      <Heading as="h1" size="page" eyebrow="Search">
        検索
      </Heading>
      <Suspense>
        <SearchView />
      </Suspense>
    </div>
  );
}
