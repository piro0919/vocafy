import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { pageOf } from '@/components/pager';
import { producers } from '@/lib/catalog';
import { PRODUCERS_PER_PAGE, ProducerList } from '../../producer-list';

// 台帳は取り込みのときにしか変わらないので、時間では作り直さず、次の配備まで作ったページを使い回す（DB を起こさないため）。
export const revalidate = false;

/** ページは数枚なので、ビルドのときに全部作る */
export async function generateStaticParams() {
  const pages = Math.ceil((await producers()).length / PRODUCERS_PER_PAGE);
  return Array.from({ length: Math.max(0, pages - 1) }, (_, i) => ({ n: String(i + 2) }));
}

export async function generateMetadata({
  params,
}: PageProps<'/producers/page/[n]'>): Promise<Metadata> {
  const { n } = await params;
  const page = pageOf([n]);
  return { title: page ? `ボカロP（${page}ページ目）` : undefined };
}

/** ボカロPの一覧の2ページ目から。1ページ目を /producers/page/1 と書いたものは無いページとして扱う */
export default async function ProducersPagedPage({ params }: PageProps<'/producers/page/[n]'>) {
  const { n } = await params;
  const page = pageOf([n]);
  if (!page) notFound();
  return <ProducerList page={page} />;
}
