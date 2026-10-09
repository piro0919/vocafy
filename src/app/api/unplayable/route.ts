import { revalidatePath } from 'next/cache';
import { isPlayable, markUnplayable } from '@/lib/unplayable';
import { isVideoId, type Service } from '@/lib/video-id';

/**
 * 再生中に「流せない」と分かった動画の知らせを受ける（src/components/player/report.ts から送る）。
 * サーバーから確かめ直し、本当に流せないときだけ台帳から外して、その曲のボカロPの画面を作り直す。
 * ほかの画面（年・歌声・あいうえお順・トップ・検索の索引）は作り置きのままで、次の配備で反映される。
 * すべての画面を作り直すと、そのあと開かれるたびに DB を読むことになり、無料プランの計算時間を食うため
 */

/** 同じ動画の知らせが続いても、確かめに行くのは1回にする（この関数の実体が動いているあいだだけ覚える） */
const seen = new Map<string, number>();
const REMEMBER_MS = 10 * 60 * 1000;

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    service?: unknown;
    videoId?: unknown;
  } | null;
  const service = body?.service;
  const id = body?.videoId;
  if (
    (service !== 'youtube' && service !== 'niconico') ||
    typeof id !== 'string' ||
    !isVideoId(service as Service, id)
  ) {
    return Response.json({ error: 'bad request' }, { status: 400 });
  }
  const key = `${service}:${id}`;
  const last = seen.get(key);
  if (last && Date.now() - last < REMEMBER_MS) return Response.json({ checked: false });
  seen.set(key, Date.now());

  const playable = await isPlayable(service, id);
  if (playable !== false) return Response.json({ checked: true, removed: false });

  const producers = await markUnplayable(service, id);
  for (const p of producers) revalidatePath(`/producers/${p}`);
  return Response.json({ checked: true, removed: true });
}
