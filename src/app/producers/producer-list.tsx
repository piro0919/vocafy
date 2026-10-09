import { notFound } from 'next/navigation';
import { Heading } from '@/components/heading';
import { producers } from '@/lib/catalog';
import { RandomProducer } from './random-producer';
import { VirtualProducerGrid } from './virtual-producer-grid';
import { formatCount } from '@/lib/format';

/**
 * 前の住所（/producers/page/2）の1ページの人数。いまはページに分けず全員を1つの格子にしている（VirtualProducerGrid）が、
 * 前の住所で開かれたときに、そのページの先頭の人まで送るのに使う
 */
export const PRODUCERS_PER_PAGE = 120;

/** ボカロPの一覧。並びは最近曲を出した人から（catalog.ts の producers）。page は前の住所のページ番号 */
export async function ProducerList({ page }: { page: number }) {
  const list = await producers();
  const start = (page - 1) * PRODUCERS_PER_PAGE;
  if (page > 1 && start >= list.length) notFound();
  return (
    <>
      <div className="flex items-end gap-3 pt-4 pb-4 sm:pb-6">
        <div>
          <Heading as="h1" size="page" eyebrow="Producers">
            ボカロP
          </Heading>
          <p className="mt-2 text-sm text-muted">{formatCount(list.length)}人</p>
        </div>
        <div className="mb-0.5 ml-auto">
          <RandomProducer ids={list.map((p) => p.id)} />
        </div>
      </div>
      <VirtualProducerGrid producers={list} start={start} />
    </>
  );
}
