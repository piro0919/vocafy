import { latestOfProducer } from '@/lib/catalog';

// そのボカロPの新しい曲（順番待ちの形）。トップのお気に入りのボカロPの新曲の棚が、ブラウザから取りに来る。
// お気に入りはブラウザの中にあるので、トップの作り置きには入れられない。ボカロPごとに、最初に読まれたときに作って
// 次の配備まで使い回す（DB を起こすのは、そのボカロPの1回目だけ）。配備のときには作らない（759 人分で配備が遅くなる）
export const dynamic = 'force-static';
export const revalidate = false;

export function generateStaticParams() {
  return [];
}

export async function GET(_: Request, { params }: RouteContext<'/api/latest/[producer]'>) {
  const id = Number((await params).producer);
  if (!Number.isSafeInteger(id)) return Response.json([], { status: 404 });
  return Response.json(await latestOfProducer(id));
}
