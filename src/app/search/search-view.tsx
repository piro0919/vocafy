'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { FadeImage } from '@/components/fade-image';
import { Icon } from '@/components/icon';
import { SongList } from '@/components/song-list';
import type { QueueItem, SearchDetails } from '@/lib/catalog';
import { normalize, score } from '@/lib/search';
import { addRecentSearch, clearRecentSearches, useRecentSearches } from '@/lib/recent-searches';
import { loadIndex, type Prepared } from '@/lib/search-index';
import { thumbOf } from '@/lib/thumb';
import { voiceArt } from '@/lib/voice-art';

/** 一度に出す曲の数。それより多く当たったときは、言葉を足して絞ってもらう */
const SONG_LIMIT = 100;
const PRODUCER_LIMIT = 12;
const VOICE_LIMIT = 12;

/** 2段目（そのボカロPの曲の id・動画の ID・表紙）。読んだものは覚えておく */
const details = new Map<number, Promise<SearchDetails>>();

function loadDetails(producerId: number): Promise<SearchDetails> {
  let pending = details.get(producerId);
  if (!pending) {
    pending = fetch(`/search-index/${producerId}`)
      .then((res) => res.json() as Promise<SearchDetails>)
      .catch((error: unknown) => {
        details.delete(producerId);
        throw error;
      });
    details.set(producerId, pending);
  }
  return pending;
}

export function SearchView() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const fromUrl = params.get('q') ?? '';
  const [text, setText] = useState(fromUrl);
  // パソコンでは上の段の欄（header-search.tsx）が住所を書き換えるので、住所が外から変わったら合わせる
  const [seen, setSeen] = useState(fromUrl);
  if (seen !== fromUrl) {
    setSeen(fromUrl);
    if (fromUrl !== text.trim()) setText(fromUrl);
  }
  const [index, setIndex] = useState<Prepared | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    loadIndex().then(setIndex, () => setFailed(true));
  }, []);

  // 打った言葉を住所に残す。打つたびに履歴が増えないよう、置き換えにする。少し待ってからまとめて書く
  useEffect(() => {
    const id = setTimeout(() => {
      const q = text.trim();
      router.replace(q ? `${pathname}?q=${encodeURIComponent(q)}` : pathname, { scroll: false });
    }, 300);
    return () => clearTimeout(id);
  }, [text, pathname, router]);

  const recent = useRecentSearches();
  const query = normalize(text);
  const found = useMemo(() => {
    if (!index || !query) return null;
    const producers = index.producers
      .map((p) => ({ p, s: score(p.key, query) }))
      .filter((x) => x.s > 0)
      .toSorted((a, b) => b.s - a.s || b.p.songCount - a.p.songCount)
      .map((x) => x.p);
    // 曲名（ローマ字の曲名も含む）で当たった曲を先に、ボカロP名だけで当たった曲を後にする。同じ当たり方の中は新しい順（索引の並び）
    const songs = index.songs
      .map((s) => ({
        s,
        rank:
          Math.max(score(s.title, query), score(s.romaji, query)) * 2 ||
          score(s.producer.key, query),
      }))
      .filter((x) => x.rank > 0)
      .toSorted((a, b) => b.rank - a.rank)
      .map((x) => x.s);
    const voices = index.voices
      .map((v) => ({ v, s: score(v.key, query) }))
      .filter((x) => x.s > 0)
      .toSorted((a, b) => b.s - a.s || b.v.songCount - a.v.songCount)
      .map((x) => x.v);
    return { producers, songs, voices };
  }, [index, query]);

  // 出す曲のボカロPの分だけ2段目を読み、曲の一覧に組み立てる。打つあいだに古い結果が後から届いても使わない
  const [shown, setShown] = useState<{ query: string; items: QueueItem[] } | null>(null);
  useEffect(() => {
    if (!found || found.songs.length === 0) return;
    const top = found.songs.slice(0, SONG_LIMIT);
    let current = true;
    Promise.all(
      [...new Set(top.map((s) => s.producer.id))].map(
        async (id) => [id, await loadDetails(id)] as const,
      ),
    ).then(
      (loaded) => {
        if (!current) return;
        const byProducer = new Map(loaded);
        const items = top.flatMap((s): QueueItem[] => {
          const row = byProducer.get(s.producer.id)?.[s.nth];
          if (!row) return [];
          const [songId, videoId, niconicoThumb] = row;
          return [
            {
              songId,
              title: s.name,
              service: niconicoThumb ? 'niconico' : 'youtube',
              videoId,
              thumb: niconicoThumb ?? thumbOf(videoId),
              producerId: s.producer.id,
              producerName: s.producer.name,
              vocalists: '',
            },
          ];
        });
        setShown({ query, items });
      },
      () => current && setFailed(true),
    );
    return () => {
      current = false;
    };
  }, [found, query]);
  const items = shown?.query === query ? shown.items : null;

  return (
    // 結果（ボカロP・歌声・曲）を押したら、そのときの言葉を最近の検索に残す。打っただけの言葉は残さない
    <div
      className="mt-4"
      onClickCapture={(e) => {
        const q = text.trim();
        const hit = (e.target as HTMLElement).closest('a, button');
        if (q && hit && hit.closest('section') && !hit.closest('[data-recent]')) addRecentSearch(q);
      }}
    >
      {/* パソコンは上の段に検索欄があるので、スマホだけで出す */}
      <label className="flex items-center gap-2 rounded-2xl border border-line/60 bg-sidebar/60 px-4 focus-within:border-accent/60 md:hidden">
        <Icon name="search" className="size-5 shrink-0 text-muted" />
        <input
          type="search"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="曲名・ボカロP・歌声"
          aria-label="曲名・ボカロP・歌声の名前で探す"
          // 検索の画面に来たら、すぐ打てるようにする
          autoFocus
          className="h-12 min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-muted"
        />
      </label>

      {/* 何も打っていないときは、最近の検索の言葉を出す。押すとその言葉で探す */}
      {!query && recent.length > 0 && (
        <section data-recent className="mt-6">
          <div className="mb-2 flex items-center gap-3">
            <h2 className="text-sm font-bold text-muted">最近の検索</h2>
            <button
              type="button"
              onClick={clearRecentSearches}
              className="ml-auto rounded-full px-3 py-1 text-xs font-bold text-muted transition-colors hover:text-foreground"
            >
              消す
            </button>
          </div>
          <ul className="flex flex-wrap gap-2">
            {recent.map((q) => (
              <li key={q} className="min-w-0">
                <button
                  type="button"
                  onClick={() => setText(q)}
                  title={q}
                  // 長い言葉は「…」で切り、札が画面からはみ出さないようにする
                  className="block max-w-60 truncate rounded-full border border-line/60 bg-sidebar/60 px-4 py-1.5 text-sm font-bold transition-[background-color,scale] duration-150 ease-out hover:bg-accent/10 active:scale-95"
                >
                  {q}
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {failed && (
        <p className="mt-6 text-sm text-muted">索引を読めませんでした。開き直してください。</p>
      )}
      {!failed && query && !index && <p className="mt-6 text-sm text-muted">読み込んでいます…</p>}

      {found && found.producers.length + found.songs.length + found.voices.length === 0 && (
        <p className="mt-6 text-sm text-muted">
          「{text.trim()}」に当てはまる曲は見つかりませんでした。
        </p>
      )}

      {found && found.producers.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 font-display text-xl">ボカロP</h2>
          <ul className="flex flex-wrap gap-2">
            {found.producers.slice(0, PRODUCER_LIMIT).map((p) => (
              <li key={p.id}>
                <Link
                  href={`/producers/${p.id}`}
                  className="flex items-center gap-2 rounded-full border border-line/60 bg-sidebar/60 py-1 pr-4 pl-1 text-sm font-bold transition-[background-color,scale] duration-150 ease-out hover:bg-accent/10 active:scale-95"
                >
                  {p.picture ? (
                    <FadeImage
                      src={p.picture}
                      alt=""
                      width={32}
                      height={32}
                      className="size-8 rounded-full bg-surface object-cover"
                    />
                  ) : (
                    <span className="size-8 rounded-full bg-surface" />
                  )}
                  {p.name}
                  <span className="text-xs font-normal text-muted">{p.songCount} 曲</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {found && found.voices.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 font-display text-xl">歌声</h2>
          <ul className="flex flex-wrap gap-2">
            {found.voices.slice(0, VOICE_LIMIT).map((v) => {
              const art = voiceArt(v.id);
              return (
                <li key={v.id}>
                  <Link
                    href={`/voices/${v.id}`}
                    className={`flex items-center gap-2 rounded-full border border-line/60 bg-sidebar/60 py-1 pr-4 text-sm font-bold transition-[background-color,scale] duration-150 ease-out hover:bg-accent/10 active:scale-95 ${art ? 'pl-1' : 'pl-4'}`}
                  >
                    {art && (
                      <span className="relative size-8 shrink-0 rounded-full bg-surface">
                        <FadeImage src={art} alt="" fill unoptimized className="object-contain" />
                      </span>
                    )}
                    {v.name}
                    <span className="text-xs font-normal text-muted">{v.songCount} 曲</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {found && found.songs.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-1 font-display text-xl">曲</h2>
          <p className="mb-3 text-sm text-muted">
            {found.songs.length} 曲
            {found.songs.length > SONG_LIMIT &&
              `（多いので先頭の ${SONG_LIMIT} 曲。言葉を足すと絞れます）`}
          </p>
          {items ? (
            <SongList songs={items} className="grid gap-1 md:grid-cols-2 xl:grid-cols-3" />
          ) : (
            <p className="text-sm text-muted">読み込んでいます…</p>
          )}
        </section>
      )}
    </div>
  );
}
