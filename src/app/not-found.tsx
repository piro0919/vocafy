import type { Metadata } from 'next';
import Link from 'next/link';
import { Heading } from '@/components/heading';
import { PRIMARY } from '@/components/button-styles';
import { Icon } from '@/components/icon';

export const metadata: Metadata = { title: 'ページが見つかりません' };

/** 無いボカロPや曲の住所、打ち間違えた住所で来たとき。取り下げの依頼で外したボカロPもここに来る */
export default function NotFound() {
  return (
    <div className="flex flex-col items-start gap-4 pt-4">
      <Heading as="h1" size="page" eyebrow="Not Found">
        ページが見つかりません
      </Heading>
      <p className="text-muted">お探しのページは存在しないか、掲載をやめた可能性があります。</p>
      <Link href="/" className={PRIMARY}>
        <Icon name="home" className="size-5" />
        ホームへ
      </Link>
    </div>
  );
}
