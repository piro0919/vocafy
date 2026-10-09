import { mkdir, readFile, writeFile } from 'node:fs/promises';

/**
 * YouTube の動画が、まだ埋め込んで流せるかを確かめる。鍵の要らない oEmbed（https://www.youtube.com/oembed）に問い合わせ、
 * 200 なら流せる、401・403・404 なら流せない（消えた・非公開・埋め込み不可）とみなす。2026-10-09 に、消えた動画で 403、
 * 生きている動画で 200 が返るのを確かめた。混み合い（429）やサーバーの不調など、ほかの返事は分からないとして流せる側に置き、
 * 次の取り込みで確かめ直す。
 *
 * 1万本を超えるので、結果は data/raw/youtube/oembed.json に残し、CHECK_AGAIN_DAYS 日たったものだけ確かめ直す。
 * 一度に投げるのは WORKERS 本まで
 */
const CACHE = new URL('../../data/raw/youtube/oembed.json', import.meta.url);
const CHECK_AGAIN_DAYS = 30;
const WORKERS = 6;
const DEAD = new Set([401, 403, 404]);

type Checked = { ok: boolean; at: string };

async function readCache(): Promise<Record<string, Checked>> {
  try {
    return JSON.parse(await readFile(CACHE, 'utf8')) as Record<string, Checked>;
  } catch {
    return {};
  }
}

/** 1本を確かめる。分からなければ null */
async function check(id: string): Promise<boolean | null> {
  const url = `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(`https://www.youtube.com/watch?v=${id}`)}`;
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'Vocafy (https://vocafy.kkweb.io)' } });
    if (res.ok) return true;
    return DEAD.has(res.status) ? false : null;
  } catch {
    return null;
  }
}

/** 流せない YouTube の動画の ID */
export async function deadYouTube(ids: string[]): Promise<Set<string>> {
  const cache = await readCache();
  const fresh = Date.now() - CHECK_AGAIN_DAYS * 24 * 60 * 60 * 1000;
  const todo = ids.filter((id) => {
    const hit = cache[id];
    return !hit || Date.parse(hit.at) < fresh;
  });
  if (todo.length > 0) console.log(`YouTube の動画を確かめます: ${todo.length} 本`);

  let next = 0;
  let done = 0;
  const work = async () => {
    while (next < todo.length) {
      const id = todo[next++];
      const ok = await check(id);
      if (ok !== null) cache[id] = { ok, at: new Date().toISOString() };
      if (++done % 1000 === 0) console.log(`  ${done}/${todo.length}`);
    }
  };
  await Promise.all(Array.from({ length: WORKERS }, work));
  await mkdir(new URL('.', CACHE), { recursive: true });
  await writeFile(CACHE, JSON.stringify(cache));

  return new Set(ids.filter((id) => cache[id]?.ok === false));
}

/**
 * YouTube の再生数。YouTube Data API の videos.list で、50 本ずつ聞く（1回 1 単位。無料枠は1日 10,000 単位）。
 * 結果は data/raw/youtube/views.json に残し、VIEWS_AGAIN_DAYS 日たったものだけ聞き直す。消えた動画は返ってこないので 0 にする
 */
const VIEWS = new URL('../../data/raw/youtube/views.json', import.meta.url);
const VIEWS_AGAIN_DAYS = 30;

type Views = { views: number; at: string };

export async function viewCounts(ids: string[], key: string): Promise<Map<string, number>> {
  let cache: Record<string, Views> = {};
  try {
    cache = JSON.parse(await readFile(VIEWS, 'utf8')) as Record<string, Views>;
  } catch {
    // まだ聞いていない
  }
  const fresh = Date.now() - VIEWS_AGAIN_DAYS * 24 * 60 * 60 * 1000;
  const todo = [...new Set(ids)].filter((id) => {
    const hit = cache[id];
    return !hit || Date.parse(hit.at) < fresh;
  });
  if (todo.length > 0) console.log(`YouTube の再生数を聞きます: ${todo.length} 本`);
  for (let i = 0; i < todo.length; i += 50) {
    const batch = todo.slice(i, i + 50);
    const params = new URLSearchParams({ part: 'statistics', id: batch.join(','), key });
    const res = await fetch(`https://www.googleapis.com/youtube/v3/videos?${params}`);
    if (!res.ok) throw new Error(`YouTube Data API ${res.status}: ${await res.text()}`);
    const { items } = (await res.json()) as {
      items: { id: string; statistics: { viewCount?: string } }[];
    };
    const at = new Date().toISOString();
    for (const id of batch) cache[id] = { views: 0, at };
    for (const item of items)
      cache[item.id] = { views: Number(item.statistics.viewCount ?? 0), at };
  }
  await mkdir(new URL('.', VIEWS), { recursive: true });
  await writeFile(VIEWS, JSON.stringify(cache));
  return new Map(ids.map((id) => [id, cache[id]?.views ?? 0]));
}
