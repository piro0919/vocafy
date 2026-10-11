import { findProducer } from '@/lib/catalog';
import { OG_SIZE, producerImage } from './og';

export const alt = 'Vocafy のボカロPの画面';
export const size = OG_SIZE;
export const contentType = 'image/png';

// ボカロPの画面と同じく、配備まで作り置く。絵を作るのは SNS が共有されたリンクを読みに来たときだけで、
// 同じ人の2回目からは作らない（関数も DB も動かない）
export const revalidate = false;

// ボカロPの画面と同じく、ビルドのときには作らず最初に読まれたときに作る。これが無いと、開くたびに作る扱いになった
export function generateStaticParams() {
  return [];
}

/** ボカロPの画面を共有したときの絵（og.tsx） */
export default async function OpengraphImage({ params }: { params: Promise<{ id: string }> }) {
  return producerImage(await findProducer(Number((await params).id)));
}
