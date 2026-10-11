import type { Metadata } from 'next';
import { ProducerList } from './producer-list';

export const metadata: Metadata = { title: 'ボカロP' };

// 台帳は取り込みのときにしか変わらないので、時間では作り直さず、次の配備まで作ったページを使い回す（DB を起こさないため）。
export const revalidate = false;

export default function ProducersPage() {
  return <ProducerList page={1} />;
}
