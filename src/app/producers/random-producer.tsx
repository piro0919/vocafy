'use client';

import { useRouter } from 'next/navigation';
import { PILL } from '@/components/button-styles';
import { Icon } from '@/components/icon';

/**
 * おまかせ。押すと、一覧のボカロPから1人を無作為に選んで、その人の画面へ移る（2026-10-10）。
 * 一覧の画面が全員の id を持っているので、DB は起こさない。どの人も同じ確率で選ぶ（トップを人気で並べないのと同じ考え）
 */
export function RandomProducer({ ids }: { ids: number[] }) {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => router.push(`/producers/${ids[Math.floor(Math.random() * ids.length)]}`)}
      className={`${PILL} flex items-center gap-1`}
    >
      <Icon name="shuffle" className="size-3.5" />
      おまかせ
    </button>
  );
}
