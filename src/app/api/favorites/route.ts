import { z } from 'zod';
import {
  mergeFavorites,
  readFavorites,
  reorderFavoriteSongs,
  setFavorite,
} from '@/lib/account-favorites';
import { userIdOf } from '@/lib/auth';

/**
 * アカウントのお気に入り。ログインしていなければ 401。
 *   GET   いまのお気に入り（曲は順番待ちの形、ボカロPは名前と画像）
 *   POST  { kind, id, on } 1件を足すか外す
 *   PUT   { songs, producers } ブラウザに残っていたものを足し、足したあとのお気に入りを返す
 *   PATCH { songs } お気に入りの曲を、この順に並べ直す
 * ユーザーごとに違うので、どこにも作り置きさせない
 */
const NO_STORE = { 'Cache-Control': 'private, no-store' };

const id = z.number().int().positive();
const kind = z.enum(['song', 'producer']);

const unauthorized = () => new Response(null, { status: 401, headers: NO_STORE });

export async function GET(request: Request) {
  const userId = await userIdOf(request);
  if (!userId) return unauthorized();
  return Response.json(await readFavorites(userId), { headers: NO_STORE });
}

export async function POST(request: Request) {
  const userId = await userIdOf(request);
  if (!userId) return unauthorized();
  const body = z.object({ kind, id, on: z.boolean() }).safeParse(await request.json());
  if (!body.success) return new Response(null, { status: 400, headers: NO_STORE });
  await setFavorite(userId, body.data.kind, body.data.id, body.data.on);
  return new Response(null, { status: 204, headers: NO_STORE });
}

export async function PUT(request: Request) {
  const userId = await userIdOf(request);
  if (!userId) return unauthorized();
  const body = z
    .object({ songs: z.array(id).max(5000), producers: z.array(id).max(5000) })
    .safeParse(await request.json());
  if (!body.success) return new Response(null, { status: 400, headers: NO_STORE });
  await mergeFavorites(userId, 'song', body.data.songs);
  await mergeFavorites(userId, 'producer', body.data.producers);
  return Response.json(await readFavorites(userId), { headers: NO_STORE });
}

export async function PATCH(request: Request) {
  const userId = await userIdOf(request);
  if (!userId) return unauthorized();
  const body = z.object({ songs: z.array(id).max(5000) }).safeParse(await request.json());
  if (!body.success) return new Response(null, { status: 400, headers: NO_STORE });
  await reorderFavoriteSongs(userId, body.data.songs);
  return new Response(null, { status: 204, headers: NO_STORE });
}
