import { producers, searchDetails } from '@/lib/catalog';

// 検索の索引の2段目（src/lib/catalog.ts の searchIndex の説明）。ボカロPごとに、配備のときに作り置く
export const dynamic = 'force-static';
export const revalidate = false;
// 配備のときに作ったボカロP以外は 404 にする。その場で作ろうとして DB を読みに行かないため
export const dynamicParams = false;

export async function generateStaticParams() {
  return (await producers()).map((p) => ({ producer: String(p.id) }));
}

export async function GET(_: Request, { params }: RouteContext<'/search-index/[producer]'>) {
  const id = Number((await params).producer);
  if (!Number.isSafeInteger(id)) return Response.json([], { status: 404 });
  return Response.json(await searchDetails(id));
}
