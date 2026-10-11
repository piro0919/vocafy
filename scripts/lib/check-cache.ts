/**
 * 取り込みの控え（data/raw/ の JSON）のうち、確かめ直す番号を選ぶ（YouTube の動画・YouTube の再生数・ニコニコの埋め込み）。
 * 控えに無い番号と、確かめてから days 日たった番号。同じ番号は1回だけ
 */
export function staleIds(
  ids: string[],
  cache: Record<string, { at: string }>,
  days: number,
  now = Date.now(),
): string[] {
  const fresh = now - days * 24 * 60 * 60 * 1000;
  return [...new Set(ids)].filter((id) => {
    const hit = cache[id];
    return !hit || Date.parse(hit.at) < fresh;
  });
}
