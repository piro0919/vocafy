import type { Metadata } from 'next';
import { YearCard } from '@/components/browse-cards';
import { Heading } from '@/components/heading';
import { years } from '@/lib/catalog';
import { langOf } from '@/i18n/config';
import { TERMS } from '@/i18n/terms';

export async function generateMetadata({ params }: PageProps<'/[lang]/years'>): Promise<Metadata> {
  return { title: TERMS[await langOf(params)].years };
}

// 台帳は取り込みのときにしか変わらないので、時間では作り直さず、次の配備まで作ったページを使い回す（DB を起こさないため）。
export const revalidate = false;

/** 年の一覧。新しい年から */
export default async function YearsPage({ params }: PageProps<'/[lang]/years'>) {
  const t = TERMS[await langOf(params)];
  const list = await years();
  return (
    <>
      <div className="pt-4 pb-4 sm:pb-6">
        <Heading as="h1" size="page" eyebrow="Years">
          {t.years}
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
