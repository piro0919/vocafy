import { notFound } from 'next/navigation';
import { ARTIST_GRID, CoverCard } from '@/components/cover-card';
import { Heading } from '@/components/heading';
import { Pager } from '@/components/pager';
import { producers } from '@/lib/catalog';

/**
 * ボカロPの一覧の1ページの人数。全員を1枚に並べると、775 人で HTML が 1.7MB になったので分ける。
 * 曲の一覧（300 曲）より少ないのは、1人ごとに画像と札があって重いため
 */
export const PRODUCERS_PER_PAGE = 120;

/** そのページの住所。1ページ目は /producers、2ページ目からは /producers/page/2（/producers/[id] とぶつけないため） */
const producersHref = (page: number) => (page === 1 ? '/producers' : `/producers/page/${page}`);

/** ボカロPの一覧の1ページ。並びは最近曲を出した人から（catalog.ts の producers） */
export async function ProducerList({ page }: { page: number }) {
  const list = await producers();
  const start = (page - 1) * PRODUCERS_PER_PAGE;
  const shown = list.slice(start, start + PRODUCERS_PER_PAGE);
  if (page > 1 && shown.length === 0) notFound();
  return (
    <>
      <div className="pt-4 pb-4 sm:pb-6">
        <Heading as="h1" size="page" eyebrow="Producers">
          ボカロP
        </Heading>
        <p className="mt-2 text-sm text-muted">{list.length} 人</p>
      </div>
      <div className={ARTIST_GRID}>
        {shown.map((p, i) => (
          <CoverCard
            key={p.id}
            href={`/producers/${p.id}`}
            playing={{ producerId: p.id }}
            cover={p.picture}
            round
            title={p.name}
            sub={`${p.songCount} 曲`}
            eager={i < 10}
          />
        ))}
      </div>
      <Pager
        base="/producers"
        page={page}
        total={list.length}
        size={PRODUCERS_PER_PAGE}
        href={producersHref}
      />
    </>
  );
}
