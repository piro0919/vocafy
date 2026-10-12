import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { staleIds } from './check-cache';
import { originalVideos, type Accounts } from './pick';
import type { VdbSong } from './vocadb';

/**
 * 本家の動画を上げた人が、編曲だけで載ったボカロP本人かを確かめる（pick.ts の arrangedOnly）。
 * 名前ではなくアカウントの番号で照らし合わせる。投稿者名（「ずきお(゜З゜)」）とボカロPの名前（ずきお）は揃っておらず、
 * 名前の近さで比べると人違いで他人の曲をその人の画面に並べうるため。
 * YouTube は Data API の videos.list でチャンネルの番号を、ニコニコは getthumbinfo でユーザーの番号を取り、
 * VocaDB のボカロPのリンク（pick.ts の accountsOf）と比べる。リンクが無い人や、別のアカウントから上げた動画は拾えず、
 * いままでどおり外れる。
 *
 * 2026-10-12 に手元で数えたとき、候補は 723 件で、確かめた 470 件のうち 45 件（ハニーワークス 19 件など）が一致した。
 *
 * 動画を上げた人は変わらないので、結果は data/raw/uploaders.json に KEEP_DAYS 日残す。ニコニコは 1 秒に 1 回まで。
 * YouTube は 50 本で 1 単位、名前で書かれたチャンネルを番号に引き直すのは 1 本 1 単位
 */
const CACHE = new URL('../../data/raw/uploaders.json', import.meta.url);
const KEEP_DAYS = 365;
const YOUTUBE_BATCH = 50;
const PROGRESS_EVERY = 100;
const HEADERS = { 'User-Agent': 'Vocafy (https://vocafy.kkweb.io)' };

type Entry = { owner: string | null; at: string };
type Cache = { videos: Record<string, Entry>; channels: Record<string, Entry> };

async function readCache(): Promise<Cache> {
  try {
    return JSON.parse(await readFile(CACHE, 'utf8')) as Cache;
  } catch {
    return { videos: {}, channels: {} };
  }
}

async function youtubeApi<T>(path: string, params: Record<string, string>, key: string) {
  const res = await fetch(
    `https://www.googleapis.com/youtube/v3/${path}?${new URLSearchParams({ ...params, key })}`,
  );
  if (!res.ok) throw new Error(`YouTube Data API ${res.status}: ${await res.text()}`);
  return ((await res.json()) as { items?: T[] }).items ?? [];
}

/** 名前で書かれたチャンネル（@名前・user/名前・c/名前）を番号に引き直す。c/ は今の @ と同じ名前のことが多いので @ として引く */
async function resolveChannels(names: string[], cache: Cache, key: string) {
  for (const name of staleIds(names, cache.channels, KEEP_DAYS)) {
    const [, kind, rest] = /^(@|user\/|c\/)(.*)$/.exec(name)!;
    const params: Record<string, string> =
      kind === 'user/' ? { forUsername: rest } : { forHandle: `@${rest}` };
    const items = await youtubeApi<{ id: string }>('channels', { part: 'id', ...params }, key);
    cache.channels[name] = { owner: items[0]?.id ?? null, at: new Date().toISOString() };
  }
}

/** YouTube の動画を上げたチャンネルの番号。消えた動画は返ってこないので null */
async function youtubeOwners(ids: string[], cache: Cache, key: string) {
  const todo = staleIds(
    ids.map((id) => `youtube:${id}`),
    cache.videos,
    KEEP_DAYS,
  ).map((k) => k.slice('youtube:'.length));
  for (let i = 0; i < todo.length; i += YOUTUBE_BATCH) {
    const batch = todo.slice(i, i + YOUTUBE_BATCH);
    const items = await youtubeApi<{ id: string; snippet: { channelId: string } }>(
      'videos',
      { part: 'snippet', id: batch.join(',') },
      key,
    );
    const at = new Date().toISOString();
    for (const id of batch) cache.videos[`youtube:${id}`] = { owner: null, at };
    for (const item of items)
      cache.videos[`youtube:${item.id}`] = { owner: item.snippet.channelId, at };
  }
}

/** ニコニコの動画を上げたユーザーの番号。消えた動画とチャンネルの動画は null。つながらなければ控えに書かず、次に聞き直す */
async function niconicoOwners(ids: string[], cache: Cache) {
  const todo = staleIds(
    ids.map((id) => `niconico:${id}`),
    cache.videos,
    KEEP_DAYS,
  ).map((k) => k.slice('niconico:'.length));
  if (todo.length > 0)
    console.log(`ニコニコの動画を上げた人を確かめます: ${todo.length} 本（1 秒に 1 本）`);
  for (const [i, id] of todo.entries()) {
    if (i > 0) await new Promise((r) => setTimeout(r, 1000));
    try {
      const res = await fetch(`https://ext.nicovideo.jp/api/getthumbinfo/${id}`, {
        headers: HEADERS,
      });
      if (res.ok) {
        const owner = /<user_id>(\d+)<\/user_id>/.exec(await res.text())?.[1] ?? null;
        cache.videos[`niconico:${id}`] = { owner, at: new Date().toISOString() };
      }
    } catch {
      // 分からない。次の取り込みで聞き直す
    }
    if ((i + 1) % PROGRESS_EVERY === 0) console.log(`  ${i + 1}/${todo.length}`);
  }
}

/**
 * 編曲だけで載ったボカロPのうち、本家の動画を自分で上げていた人。曲の番号 → ボカロPの番号。
 * pairs は arrangedOnly に当たった曲とボカロP、accountsOf はボカロPのアカウント（VocaDB のリンクから）。
 * youtubeKey が無ければニコニコの動画だけで確かめる
 */
export async function confirmUploaders(
  pairs: { song: VdbSong; producerId: number }[],
  accountsOf: (producerId: number) => Promise<Accounts>,
  youtubeKey: string | undefined,
): Promise<Map<number, Set<number>>> {
  const confirmed = new Map<number, Set<number>>();
  if (pairs.length === 0) return confirmed;
  const cache = await readCache();

  const accounts = new Map<number, Accounts>();
  for (const id of new Set(pairs.map((p) => p.producerId))) accounts.set(id, await accountsOf(id));
  const videos = pairs.flatMap((p) => originalVideos(p.song));
  if (youtubeKey) {
    await resolveChannels(
      [...accounts.values()].flatMap((a) => a.youtubeNames),
      cache,
      youtubeKey,
    );
    await youtubeOwners(
      videos.filter((v) => v.service === 'youtube').map((v) => v.id),
      cache,
      youtubeKey,
    );
  }
  await niconicoOwners(
    videos.filter((v) => v.service === 'niconico').map((v) => v.id),
    cache,
  );
  await mkdir(new URL('.', CACHE), { recursive: true });
  await writeFile(CACHE, JSON.stringify(cache));

  for (const { song, producerId } of pairs) {
    const a = accounts.get(producerId)!;
    const youtube = new Set([
      ...a.youtube,
      ...a.youtubeNames.flatMap((n) => cache.channels[n]?.owner ?? []),
    ]);
    const niconico = new Set(a.niconico);
    const own = originalVideos(song).some((v) => {
      const owner = cache.videos[`${v.service}:${v.id}`]?.owner;
      return owner != null && (v.service === 'youtube' ? youtube : niconico).has(owner);
    });
    if (own) confirmed.set(song.id, (confirmed.get(song.id) ?? new Set()).add(producerId));
  }
  return confirmed;
}
