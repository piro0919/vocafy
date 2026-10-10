import { findProducer, queueOf } from '@/lib/catalog';

// そのボカロPの流せる曲（順番待ちの形。ボカロPの画面と同じ並び）。ラジオをボカロPの画面へ移らずにやめたとき、
// いまの曲のボカロPの並びに差し替えるのに、ブラウザから取りに来る。ボカロPごとに、最初に読まれたときに作って
// 次の配備まで使い回す（DB を起こすのは、そのボカロPの1回目だけ）。配備のときには作らない
export const dynamic = 'force-static';
export const revalidate = false;

export function generateStaticParams() {
  return [];
}

export async function GET(_: Request, { params }: RouteContext<'/api/producer-queue/[producer]'>) {
  const found = await findProducer(Number((await params).producer));
  if (!found) return Response.json([], { status: 404 });
  return Response.json(queueOf(found.songs, found.producer));
}
