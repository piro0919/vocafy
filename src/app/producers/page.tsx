import type { Metadata } from 'next';
import { ARTIST_GRID, CoverCard } from '@/components/cover-card';
import { producers } from '@/lib/catalog';
import { Heading } from '@/components/heading';

export const metadata: Metadata = { title: 'ボカロP' };

// 台帳は取り込みのときにしか変わらないので、1時間は作ったページを使い回す
export const revalidate = 3600;

export default async function ProducersPage() {
  const list = await producers();
  return (
    <>
      <div className="pt-4 pb-4 sm:pb-6">
        <Heading as="h1" size="page" eyebrow="Producers">
          ボカロP
        </Heading>
      </div>
      <div className={ARTIST_GRID}>
        {list.map((p, i) => (
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
    </>
  );
}
