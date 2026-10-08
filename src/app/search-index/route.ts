import { searchIndex } from '@/lib/catalog';

// 検索の索引。配備のときに1回だけ作って配る。GET の住所は既定では開くたびに作り直すので、作り置きを指定する。
// 検索のたびに DB を読まないための仕組みで、探すのはブラウザの側（src/app/search/search-view.tsx）
export const dynamic = 'force-static';
export const revalidate = false;

export async function GET() {
  return Response.json(await searchIndex());
}
