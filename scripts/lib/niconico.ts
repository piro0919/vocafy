import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';

/**
 * ニコニコのスナップショット検索 API（https://site.nicovideo.jp/search-api-docs/snapshot）。鍵は要らない。
 * 合成音声のタグが付いた、再生数が LEGEND 以上の動画（伝説入り）の ID を集める。2026-10-09 に、VOCALOID のタグで 1,113 本、
 * 下の TAGS のどれかで 1,119 本が返るのを確かめた。
 *
 * 結果は data/raw/niconico/legend.json に残し、MAX_AGE_DAYS 日のあいだはそれを読む（新しい伝説入りを拾うため、過ぎたら取り直す）。
 * 1回に返るのは 100 本までなので、ずらしながら取る。相手に負荷をかけないよう、1 秒に 1 回までにする
 */
const BASE = 'https://snapshot.search.nicovideo.jp/api/v2/snapshot/video/contents/search';
const CACHE = new URL('../../data/raw/niconico/legend.json', import.meta.url);
const LEGEND = 1_000_000;
const TAGS = [
  'VOCALOID',
  'CeVIO',
  'SynthesizerV',
  'UTAU',
  'VoiSona',
  'NEUTRINO',
  'VOICEPEAK',
  'VOICEVOX',
];
const PAGE = 100;
/** 全体の取り込み（手元で走らせる）の控えは、VocaDB の控えと同じく 30 日（scripts/lib/vocadb.ts） */
const MAX_AGE_DAYS = 30;

/**
 * 伝説入りの動画の ID（sm で始まるもの）。再生数の多い順。since（2025-10-09 の形）を渡すと、その日より後に投稿された動画だけを
 * 控えを使わずに聞く。新しいボカロPを拾う自動の取り込み（ingest --recent）が使い、2026-10-09 にこの1年で 4 本だった
 */
export async function legendVideos(since?: string): Promise<string[]> {
  if (!since) {
    try {
      if (Date.now() - (await stat(CACHE)).mtimeMs < MAX_AGE_DAYS * 24 * 60 * 60 * 1000) {
        return JSON.parse(await readFile(CACHE, 'utf8')) as string[];
      }
    } catch {
      // まだ取っていない
    }
  }
  const ids: string[] = [];
  for (let offset = 0; ; offset += PAGE) {
    const params = new URLSearchParams({
      q: TAGS.join(' OR '),
      targets: 'tagsExact',
      fields: 'contentId',
      'filters[viewCounter][gte]': String(LEGEND),
      _sort: '-viewCounter',
      _offset: String(offset),
      _limit: String(PAGE),
      _context: 'vocafy',
    });
    if (since) params.set('filters[startTime][gte]', `${since}T00:00:00+09:00`);
    if (offset > 0) await new Promise((r) => setTimeout(r, 1000));
    const res = await fetch(`${BASE}?${params}`, {
      headers: { 'User-Agent': 'Vocafy (https://vocafy.kkweb.io)' },
    });
    if (!res.ok) throw new Error(`ニコニコの検索 ${res.status}`);
    const { data } = (await res.json()) as { data: { contentId: string }[] };
    ids.push(...data.map((d) => d.contentId));
    if (data.length < PAGE) break;
  }
  if (since) return ids;
  await mkdir(new URL('.', CACHE), { recursive: true });
  await writeFile(CACHE, JSON.stringify(ids));
  return ids;
}

/**
 * ニコニコの動画が、まだ埋め込んで流せるかを確かめる。埋め込みのページ（https://embed.nicovideo.jp/watch/sm…）が
 * 200 なら流せる、403・404 なら流せないとみなす。2026-10-11 に、再生中に流せないと分かった 52 本で、センシティブ扱いの
 * 動画（ニコニコ動画でのみ視聴できる）が 403、消えた動画が 404 を返し、生きている動画が 200 を返すのを確かめた。
 * 動画の情報の窓口（getthumbinfo）はセンシティブ扱いの動画でも embeddable が 1 のままなので使わない。
 * ほかの返事は分からないとして流せる側に置き、次の取り込みで確かめ直す。
 *
 * 結果は data/raw/niconico/embed.json に残し、CHECK_AGAIN_DAYS 日たったものだけ確かめ直す。相手に負荷をかけないよう、
 * 1 秒に 1 回までにする
 */
const EMBED_CACHE = new URL('../../data/raw/niconico/embed.json', import.meta.url);
const CHECK_AGAIN_DAYS = 30;
const EMBED_DEAD = new Set([403, 404]);
const PROGRESS_EVERY = 500;

type Checked = { ok: boolean; at: string };

/** 流せないニコニコの動画の ID */
export async function deadNiconico(ids: string[]): Promise<Set<string>> {
  let cache: Record<string, Checked> = {};
  try {
    cache = JSON.parse(await readFile(EMBED_CACHE, 'utf8')) as Record<string, Checked>;
  } catch {
    // まだ確かめていない
  }
  const fresh = Date.now() - CHECK_AGAIN_DAYS * 24 * 60 * 60 * 1000;
  const todo = [...new Set(ids)].filter((id) => {
    const hit = cache[id];
    return !hit || Date.parse(hit.at) < fresh;
  });
  if (todo.length > 0)
    console.log(`ニコニコの埋め込みを確かめます: ${todo.length} 本（1 秒に 1 本）`);
  for (const [i, id] of todo.entries()) {
    if (i > 0) await new Promise((r) => setTimeout(r, 1000));
    try {
      const res = await fetch(`https://embed.nicovideo.jp/watch/${id}`, {
        headers: { 'User-Agent': 'Vocafy (https://vocafy.kkweb.io)' },
      });
      if (res.ok || EMBED_DEAD.has(res.status))
        cache[id] = { ok: res.ok, at: new Date().toISOString() };
    } catch {
      // 分からない。次の取り込みで確かめ直す
    }
    if ((i + 1) % PROGRESS_EVERY === 0) console.log(`  ${i + 1}/${todo.length}`);
  }
  await mkdir(new URL('.', EMBED_CACHE), { recursive: true });
  await writeFile(EMBED_CACHE, JSON.stringify(cache));
  return new Set(ids.filter((id) => cache[id]?.ok === false));
}
