import type { Metadata } from 'next';
import Link from 'next/link';
import { Heading } from '@/components/heading';

export const metadata: Metadata = { title: 'ページが見つかりません' };

/** 無いボカロPや曲の住所、打ち間違えた住所で来たとき。取り下げの依頼で外したボカロPもここに来る */
export default function NotFound() {
  return (
    <div className="flex flex-col items-start gap-4 pt-4">
      <Heading as="h1" size="page" eyebrow="Not Found">
        ページが見つかりません
      </Heading>
      <p className="text-muted">お探しのページは存在しないか、掲載をやめた可能性があります。</p>
      <Link
        href="/"
        className="rounded-full px-5 py-2 text-sm font-bold bg-miku text-on-miku shadow-lg shadow-miku/30 transition-[filter,scale] duration-150 ease-(--ease-out) hover:brightness-110 active:scale-95"
      >
        ホームへ
      </Link>
    </div>
  );
}
