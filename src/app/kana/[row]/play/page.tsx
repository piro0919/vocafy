import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Heading } from '@/components/heading';
import { ListPlayer } from '@/components/list-player';
import { songsOfRow } from '@/lib/catalog';
import { isRow } from '@/lib/kana';
import { rowTitle } from '@/lib/list-titles';

// 一覧の画面と同じく、次の配備まで作ったページを使い回す。ビルドのときには作らず、最初に開かれたときに作る
export const revalidate = false;

export function generateStaticParams() {
  return [];
}

export async function generateMetadata({
  params,
}: PageProps<'/kana/[row]/play'>): Promise<Metadata> {
  const row = decodeURIComponent((await params).row);
  return { title: isRow(row) ? `${rowTitle(row)}の曲` : undefined, robots: { index: false } };
}

/** あいうえお順の行の曲の再生用の画面（list-player.tsx）。行の画面の「すべて再生」から */
export default async function KanaPlayPage({ params }: PageProps<'/kana/[row]/play'>) {
  const row = decodeURIComponent((await params).row);
  if (!isRow(row)) notFound();
  const { songs, total } = await songsOfRow(row, 1);
  if (songs.length === 0) notFound();
  return (
    <div className="pt-4">
      <ListPlayer
        source={`kana/${row}`}
        songs={songs}
        total={total}
        heading={
          <Heading as="h1" size="page" eyebrow="Index">
            {rowTitle(row)}の曲
          </Heading>
        }
      />
    </div>
  );
}
