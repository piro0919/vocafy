import { notFound } from 'next/navigation';
import { Heading } from '@/components/heading';
import { producers } from '@/lib/catalog';
import { VirtualProducerGrid } from './virtual-producer-grid';
import { formatCount } from '@/lib/format';
import type { Lang } from '@/i18n/config';
import { defineText } from '@/i18n/text';
import { TERMS } from '@/i18n/terms';

const TEXT = defineText({
  ja: { people: (n: string) => `${n}人` },
  en: { people: (n: string) => (n === '1' ? '1 producer' : `${n} producers`) },
});

/**
 * 前の住所（/producers/page/2）の1ページの人数。いまはページに分けず全員を1つの格子にしている（VirtualProducerGrid）が、
 * 前の住所で開かれたときに、そのページの先頭の人まで送るのに使う
 */
export const PRODUCERS_PER_PAGE = 120;

/** ボカロPの一覧。並びは最近曲を出した人から（catalog.ts の producers）。page は前の住所のページ番号 */
export async function ProducerList({ page, lang }: { page: number; lang: Lang }) {
  const list = await producers();
  const start = (page - 1) * PRODUCERS_PER_PAGE;
  if (page > 1 && start >= list.length) notFound();
  return (
    <>
      <div className="pt-4 pb-4 sm:pb-6">
        <Heading as="h1" size="page" eyebrow="Producers">
          {TERMS[lang].producers}
        </Heading>
        <p className="mt-2 text-sm text-muted">{TEXT[lang].people(formatCount(list.length))}</p>
      </div>
      <VirtualProducerGrid producers={list} start={start} />
    </>
  );
}
