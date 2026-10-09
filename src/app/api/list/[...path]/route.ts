import {
  findVoice,
  type Paged,
  songsOfDay,
  songsOfRow,
  songsOfVoiceYear,
  songsOfYear,
} from '@/lib/catalog';
import { isRow } from '@/lib/kana';

/** 一覧の住所（/years/2010 の years/2010 の部分）とページから、その一覧のそのページを読む。知らない住所は null */
function read(source: string[], page: number): Promise<Paged> | null {
  const [kind, a, b] = source;
  if (kind === 'years' && source.length === 2) return songsOfYear(Number(a), page);
  if (kind === 'days' && source.length === 2) return songsOfDay(a, page);
  if (kind === 'kana' && source.length === 2) {
    const row = decodeURIComponent(a);
    return isRow(row) ? songsOfRow(row, page) : null;
  }
  if (kind === 'voices' && source.length === 3) return songsOfVoiceYear(Number(a), Number(b), page);
  // 歌声の画面の代表曲（年ごとに数曲）。1ページに収まるので、2ページ目からは空
  if (kind === 'voices' && source.length === 2) {
    return findVoice(Number(a)).then((found) =>
      found && page === 1
        ? { songs: found.songs, total: found.songs.length }
        : { songs: [], total: found?.songs.length ?? 0 },
    );
  }
  return null;
}

/**
 * 一覧の次のページの曲（順番待ちの形）。「すべて再生」で流している並びが終わりに近づいたときに、ブラウザから取りに来る。
 * 住所は /api/list/years/2010/2 のように、一覧の住所の後ろにページ番号を付ける。
 * 台帳は取り込みのときにしか変わらないので、Vercel の CDN に1日置いて、関数と DB を起こす回数を減らす
 */
export async function GET(_req: Request, ctx: RouteContext<'/api/list/[...path]'>) {
  const { path } = await ctx.params;
  const page = Number(path.at(-1));
  const result = Number.isSafeInteger(page) && page >= 1 ? read(path.slice(0, -1), page) : null;
  if (!result) return new Response(null, { status: 404 });
  const { songs } = await result;
  return Response.json(songs, {
    headers: { 'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800' },
  });
}
