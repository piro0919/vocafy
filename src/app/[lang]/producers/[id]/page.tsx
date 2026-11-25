import { LANGS, langOf } from '@/i18n/config';
import { canonical, isIndexedProducer } from '@/lib/site';
import { producerName } from '@/lib/producer-name';
import { producerNamesFor } from '@/lib/producer-names';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { findProducer, producers } from '@/lib/catalog';
import { ProducerView } from './producer-view';

// 台帳は取り込みのときにしか変わらないので、時間では作り直さず、次の配備まで作ったページを使い回す（DB を起こさないため）。
// ボカロPの画面は、英語の分も含めてビルドのときに全員分を作る。開かれたときに作っていたころは、配備のたびに1日数百枚を作り直して
// DB が起き続け、Neon の無料の計算時間を使い切りかけた（2026-11-19）。英語の画面への要求も4分の1ほどあったので、英語も作る
export const revalidate = false;

export async function generateStaticParams() {
  const all = await producers();
  return LANGS.flatMap((lang) => all.map((p) => ({ lang, id: String(p.id) })));
}

export async function generateMetadata({
  params,
}: PageProps<'/[lang]/producers/[id]'>): Promise<Metadata> {
  const found = await findProducer(Number((await params).id));
  if (!found) notFound();
  const lang = await langOf(params);
  const names = await producerNamesFor(lang);
  const title = producerName(found.producer.id, found.producer.name, names);
  // 曲の少ない人の画面は検索に載せない。noindex と canonical を一緒に書くと食い違う合図になるので、canonical は書かない
  if (!isIndexedProducer(found.producer.songCount)) {
    return { title, robots: { index: false, follow: true } };
  }
  return {
    title,
    // 流している曲を入れた住所（?song=）も、この住所にまとめる
    alternates: canonical(`/producers/${found.producer.id}`, lang),
  };
}

export default async function ProducerPage({ params }: PageProps<'/[lang]/producers/[id]'>) {
  const found = await findProducer(Number((await params).id));
  if (!found) notFound();
  return <ProducerView found={found} lang={await langOf(params)} />;
}
