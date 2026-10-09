import { relatedSongs } from '@/lib/catalog';

/**
 * その曲の関連曲（流せるものだけ、順番待ちの形）。ラジオが並びの終わりに近づいたときに、ブラウザから取りに来る。
 * 同じ曲には同じ答えを返すので、Vercel の CDN に1日置いて、関数と DB を起こす回数を減らす
 */
export async function GET(_req: Request, ctx: RouteContext<'/api/related/[id]'>) {
  const { id } = await ctx.params;
  const songs = await relatedSongs(Number(id));
  return Response.json(songs, {
    headers: { 'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800' },
  });
}
