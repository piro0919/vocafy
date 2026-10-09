import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Heading } from '@/components/heading';
import { RadioPlayer } from '@/components/radio-player';
import { relatedSongs, songsByIds } from '@/lib/catalog';

// 一覧の画面と同じく、次の配備まで作ったページを使い回す。ビルドのときには作らず、最初に開かれたときに作る
export const revalidate = false;

export function generateStaticParams() {
  return [];
}

export async function generateMetadata({ params }: PageProps<'/radio/[id]'>): Promise<Metadata> {
  const { id } = await params;
  const [seed] = await songsByIds([Number(id)]);
  return { title: seed ? `${seed.title}のラジオ` : 'ラジオ', robots: { index: false } };
}

/**
 * ラジオの画面（radio-player.tsx）。その曲と関連曲を並べて流し、最後の曲に入ったら、そのとき流れている曲の関連曲を後ろに足す。
 * 再生の帯のラジオのボタンからここへ移る
 */
export default async function RadioPage({ params }: PageProps<'/radio/[id]'>) {
  const id = Number((await params).id);
  if (!Number.isSafeInteger(id)) notFound();
  const [[seed], related] = await Promise.all([songsByIds([id]), relatedSongs(id)]);
  if (!seed) notFound();
  return (
    <div className="pt-4">
      <RadioPlayer
        songs={[seed, ...related.filter((s) => s.songId !== id)]}
        heading={
          <Heading as="h1" size="page" eyebrow="Radio">
            {seed.title}のラジオ
          </Heading>
        }
      />
    </div>
  );
}
