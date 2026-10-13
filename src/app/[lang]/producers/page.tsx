import type { Metadata } from 'next';
import { langOf } from '@/i18n/config';
import { canonical } from '@/lib/site';
import { TERMS } from '@/i18n/terms';
import { ProducerList } from './producer-list';

export async function generateMetadata({
  params,
}: PageProps<'/[lang]/producers'>): Promise<Metadata> {
  const lang = await langOf(params);
  return { title: TERMS[lang].producers, alternates: canonical('/producers', lang) };
}

// 台帳は取り込みのときにしか変わらないので、時間では作り直さず、次の配備まで作ったページを使い回す（DB を起こさないため）。
export const revalidate = false;

export default async function ProducersPage({ params }: PageProps<'/[lang]/producers'>) {
  return <ProducerList page={1} lang={await langOf(params)} />;
}
