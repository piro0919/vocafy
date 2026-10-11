import { langOf } from '@/i18n/config';
import { producerName } from '@/lib/producer-name';
import { producerNamesFor } from '@/lib/producer-names';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { findProducer } from '@/lib/catalog';
import { ProducerView } from './producer-view';

// 台帳は取り込みのときにしか変わらないので、時間では作り直さず、次の配備まで作ったページを使い回す（DB を起こさないため）。
// ボカロPの画面はビルドのときには作らず、最初に開かれたときに作って残す
export const revalidate = false;

export function generateStaticParams() {
  return [];
}

export async function generateMetadata({
  params,
}: PageProps<'/[lang]/producers/[id]'>): Promise<Metadata> {
  const found = await findProducer(Number((await params).id));
  if (!found) notFound();
  const names = await producerNamesFor(await langOf(params));
  return { title: producerName(found.producer.id, found.producer.name, names) };
}

export default async function ProducerPage({ params }: PageProps<'/[lang]/producers/[id]'>) {
  const found = await findProducer(Number((await params).id));
  if (!found) notFound();
  return <ProducerView found={found} lang={await langOf(params)} />;
}
