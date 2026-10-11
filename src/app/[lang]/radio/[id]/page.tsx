import { displayTitle } from '@/lib/english-name';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { RadioPlayer } from '@/components/radio-player';
import { songsByIds } from '@/lib/catalog';
import { langOf } from '@/i18n/config';
import { TERMS } from '@/i18n/terms';

// 一覧の画面と同じく、次の配備まで作ったページを使い回す。ビルドのときには作らず、最初に開かれたときに作る
export const revalidate = false;

export function generateStaticParams() {
  return [];
}

export async function generateMetadata({
  params,
}: PageProps<'/[lang]/radio/[id]'>): Promise<Metadata> {
  const { id } = await params;
  if (!Number.isSafeInteger(Number(id))) notFound();
  const [seed] = await songsByIds([Number(id)]);
  if (!seed) notFound();
  const lang = await langOf(params);
  return { title: TERMS[lang].radioOf(displayTitle(seed, lang).main), robots: { index: false } };
}

/**
 * ラジオの画面（radio-player.tsx）。その曲と関連曲を並べて流し、最後の曲に入ったら、そのとき流れている曲の関連曲を後ろに足す。
 * 再生の帯のラジオのボタンからここへ移る。
 * サーバーで引くのは元の曲だけで、関連曲はブラウザが /api/related から取る。VocaDB の関連曲の返事は初めての曲だと
 * 2〜8秒かかり、ここで待つと画面が届くまで切り替えが止まって見えた
 */
export default async function RadioPage({ params }: PageProps<'/[lang]/radio/[id]'>) {
  const id = Number((await params).id);
  if (!Number.isSafeInteger(id)) notFound();
  const [seed] = await songsByIds([id]);
  if (!seed) notFound();
  const lang = await langOf(params);
  return (
    <div className="pt-content-top">
      <RadioPlayer
        seed={seed}
        eyebrow="Radio"
        title={TERMS[lang].radioOf(displayTitle(seed, lang).main)}
      />
    </div>
  );
}
