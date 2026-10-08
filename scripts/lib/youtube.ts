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
