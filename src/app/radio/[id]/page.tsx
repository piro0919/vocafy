import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Heading } from '@/components/heading';
import { RadioPlayer } from '@/components/radio-player';
import { songsByIds } from '@/lib/catalog';

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
 * 再生の帯のラジオのボタンからここへ移る。
 * サーバーで引くのは元の曲だけで、関連曲はブラウザが /api/related から取る。VocaDB の関連曲の返事は初めての曲だと
 * 2〜8秒かかり、ここで待つと画面が届くまで切り替えが止まって見えた
 */
export default async function RadioPage({ params }: PageProps<'/radio/[id]'>) {
  const id = Number((await params).id);
  if (!Number.isSafeInteger(id)) notFound();
  const [seed] = await songsByIds([id]);
  if (!seed) notFound();
  return (
    <div className="pt-4">
      <RadioPlayer
        seed={seed}
        heading={
          <Heading as="h1" size="page" eyebrow="Radio">
            {seed.title}のラジオ
          </Heading>
        }
      />
    </div>
  );
}
