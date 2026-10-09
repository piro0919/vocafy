import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Heading } from '@/components/heading';
import { ListPlayer } from '@/components/list-player';
import { dailyMix, MIX_SIZE } from '@/lib/catalog';

// 一覧の画面と同じく、次の配備まで作ったページを使い回す。ビルドのときには作らず、最初に開かれたときに作る。
// 並びは日付で決まる（catalog.ts の dailyMix）ので、住所の日付からトップと同じ並びを作り直せる
export const revalidate = false;

export function generateStaticParams() {
  return [];
}

export function generateMetadata(): Metadata {
  return { title: 'きょうの出会い', robots: { index: false } };
}

/** トップの日替わりの並び（きょうの出会い）の再生用の画面（list-player.tsx）。トップの区画の「再生」から */
export default async function MixPlayPage({ params }: PageProps<'/mix/[date]/play'>) {
  const { date } = await params;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) notFound();
  const songs = await dailyMix(date, MIX_SIZE);
  if (songs.length === 0) notFound();
  return (
    <div className="pt-4">
      <ListPlayer
        source={`mix/${date}`}
        songs={songs}
        total={songs.length}
        heading={
          <Heading as="h1" size="page" eyebrow="Daily Mix">
            きょうの出会い
          </Heading>
        }
      />
    </div>
  );
}
