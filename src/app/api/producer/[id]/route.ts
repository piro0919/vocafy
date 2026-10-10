import { producerCard } from '@/lib/catalog';

// ボカロPの名前・画像・本人の場所（X などのリンク）。動画を大きく出す画面（お気に入りの曲・一覧の再生用・ラジオ）で、流している曲のボカロPを
// 動画の下に出すときに、ブラウザから取りに来る。曲の情報（QueueItem）に画像を足すと、一覧の曲すべてに画像の住所が載って
// 重くなるので、要る人の分だけここで引く。ボカロPごとに、最初に読まれたときに作って次の配備まで使い回す
export const dynamic = 'force-static';
export const revalidate = false;

export function generateStaticParams() {
  return [];
}

export async function GET(_: Request, { params }: RouteContext<'/api/producer/[id]'>) {
  const id = Number((await params).id);
  if (!Number.isSafeInteger(id)) return Response.json(null, { status: 404 });
  const found = await producerCard(id);
  return found ? Response.json(found) : Response.json(null, { status: 404 });
}
