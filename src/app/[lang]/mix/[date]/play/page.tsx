import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ListPlayer } from '@/components/list-player';
import { dailyMix, MIX_SIZE } from '@/lib/catalog';
import { langOf } from '@/i18n/config';
import { TERMS } from '@/i18n/terms';

// 一覧の画面と同じく、次の配備まで作ったページを使い回す。ビルドのときには作らず、最初に開かれたときに作る。
// 並びは日付で決まる（catalog.ts の dailyMix）ので、住所の日付からトップと同じ並びを作り直せる
export const revalidate = false;

export function generateStaticParams() {
  return [];
}

export async function generateMetadata({
  params,
}: PageProps<'/[lang]/mix/[date]/play'>): Promise<Metadata> {
  const { date } = await params;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || (await dailyMix(date, MIX_SIZE)).length === 0)
    notFound();
  return { title: TERMS[await langOf(params)].dailyMix, robots: { index: false } };
}

/** トップの日替わりの並び（きょうの出会い）の再生用の画面（list-player.tsx）。トップの区画の「再生」から */
export default async function MixPlayPage({ params }: PageProps<'/[lang]/mix/[date]/play'>) {
  const { date } = await params;
  const t = TERMS[await langOf(params)];
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) notFound();
  const songs = await dailyMix(date, MIX_SIZE);
  if (songs.length === 0) notFound();
  return (
    <div className="pt-content-top">
      <ListPlayer source={`mix/${date}`} songs={songs} eyebrow="Daily Mix" title={t.dailyMix} />
    </div>
  );
}
