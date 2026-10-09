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
/** 取り込みは週に2回なので、VocaDB の曲の一覧と同じく 6 日（scripts/lib/vocadb.ts の maxAgeDays） */
const MAX_AGE_DAYS = 6;

/** 伝説入りの動画の ID（sm で始まるもの）。再生数の多い順 */
export async function legendVideos(): Promise<string[]> {
  try {
    if (Date.now() - (await stat(CACHE)).mtimeMs < MAX_AGE_DAYS * 24 * 60 * 60 * 1000) {
      return JSON.parse(await readFile(CACHE, 'utf8')) as string[];
    }
  } catch {
    // まだ取っていない
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
    if (offset > 0) await new Promise((r) => setTimeout(r, 1000));
    const res = await fetch(`${BASE}?${params}`, {
      headers: { 'User-Agent': 'Vocafy (https://vocafy.kkweb.io)' },
    });
    if (!res.ok) throw new Error(`ニコニコの検索 ${res.status}`);
    const { data } = (await res.json()) as { data: { contentId: string }[] };
    ids.push(...data.map((d) => d.contentId));
    if (data.length < PAGE) break;
  }
  await mkdir(new URL('.', CACHE), { recursive: true });
  await writeFile(CACHE, JSON.stringify(ids));
  return ids;
}
