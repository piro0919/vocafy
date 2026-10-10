import { z } from 'zod';
import { producersByIds, songsByIds } from '@/lib/catalog';
import { MAX_FAVORITES } from '@/lib/favorites-limit';

/**
 * ブラウザに残したお気に入りの、いまの情報。ログインしていない人のお気に入りは、足したときの情報（動画の ID・表紙・名前）を
 * そのまま localStorage に持つので、動画が差し替わったりボカロPが画像を変えたりすると古くなる。お気に入りの画面を開いたときに、
 * id を送って引き直す（src/lib/favorites.ts の useRefreshFavorites）。流せなくなった曲と台帳から消えた人は返さない。
 * ログインしている人は /api/favorites の GET が同じ役目をする
 */
export async function POST(request: Request) {
  const id = z.number().int().positive();
  const body = z
    .object({ songs: z.array(id).max(MAX_FAVORITES), producers: z.array(id).max(MAX_FAVORITES) })
    .safeParse(await request.json().catch(() => null));
  if (!body.success) return new Response(null, { status: 400 });
  const [songs, producers] = await Promise.all([
    songsByIds(body.data.songs),
    producersByIds(body.data.producers),
  ]);
  return Response.json({ songs, producers });
}
