import type { Metadata } from 'next';
import { YearCard } from '@/components/browse-cards';
import { Heading } from '@/components/heading';
import { years } from '@/lib/catalog';

export const metadata: Metadata = { title: '年代' };

// 台帳は取り込みのときにしか変わらないので、時間では作り直さず、次の配備まで作ったページを使い回す（DB を起こさないため）。
export const revalidate = false;

/** 年の一覧。新しい年から */
export default async function YearsPage() {
  const list = await years();
  return (
    <>
      <div className="pt-4 pb-4 sm:pb-6">
        <Heading as="h1" size="page" eyebrow="Years">
          年代
        </Heading>
      </div>
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
        {list.map((y) => (
          <li key={y.year}>
            <YearCard year={y.year} count={y.count} className="h-full" />
          </li>
        ))}
      </ul>
    </>
  );
}
