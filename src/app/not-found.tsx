import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = { title: 'ページが見つかりません' };

/** 消したアルバムや、打ち間違えた URL で来たとき。削除の依頼で下げたアルバムもここに来る */
export default function NotFound() {
  return (
    <div className="flex flex-col items-start gap-4 pt-16">
      <h1 className="text-2xl font-bold">ページが見つかりません</h1>
      <p className="text-muted">お探しのページは存在しないか、掲載をやめた可能性があります。</p>
      <Link
        href="/"
        className="rounded-full bg-foreground px-5 py-2 text-sm font-bold text-background hover:bg-muted"
      >
        ホームへ
      </Link>
    </div>
  );
}
