'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { FadeImage } from '@/components/fade-image';
import { Icon } from '@/components/icon';
import { SongList } from '@/components/song-list';
import type { QueueItem, SearchDetails, SearchIndex } from '@/lib/catalog';
import { normalize, normalizeRomaji, score } from '@/lib/search';
import { thumbOf } from '@/lib/thumb';

/** 一度に出す曲の数。それより多く当たったときは、言葉を足して絞ってもらう */
const SONG_LIMIT = 100;
const PRODUCER_LIMIT = 12;

type Producer = {
  id: number;
  name: string;
  picture: string | null;
  songCount: number;
  key: string;
};

/** 1段目の索引に、探すための正規化した文字を足したもの */
type Prepared = {
  producers: Producer[];
  /**
   * title と romaji は探すための形（romaji はローマ字の曲名が無ければ空）。nth は、そのボカロPの曲の中で何番目か。
   * 2段目（ボカロPごとのファイル）の何番目を見ればよいかに使う
   */
  songs: { name: string; producer: Producer; nth: number; title: string; romaji: string }[];
};

/** 1段目は画面を移っても一度だけ読む */
let loading: Promise<Prepared> | undefined;

function loadIndex(): Promise<Prepared> {
  const pending = (loading ??= fetch('/search-index')
    .then((res) => res.json() as Promise<SearchIndex>)
    .then(({ producers, songs }): Prepared => {
      const list = producers.map(([id, name, picture, songCount]) => ({
        id,
        name,
        picture,
        songCount,
        key: normalize(name),
      }));
      const counts = new Map<number, number>();
      return {
        producers: list,
        songs: songs.map(([name, at, romaji]) => {
          const producer = list[at];
          const nth = counts.get(at) ?? 0;
          counts.set(at, nth + 1);
          return {
            name,
            producer,
            nth,
            title: normalize(name),
            romaji: romaji ? normalizeRomaji(romaji) : '',
          };
        }),
      };
    })
    .catch((error: unknown) => {
      // 読めなかったときは、次に開いたときに読み直す
      loading = undefined;
      throw error;
    }));
  return pending;
}

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
  const [text, setText] = useState(params.get('q') ?? '');
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
    return { producers, songs };
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
    <div className="mt-4">
      <label className="flex items-center gap-2 rounded-2xl border border-line/60 bg-sidebar/60 px-4 focus-within:border-accent/60">
        <Icon name="search" className="size-5 shrink-0 text-muted" />
        <input
          type="search"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="曲名・ボカロP"
          aria-label="曲名かボカロPの名前で探す"
          // 検索の画面に来たら、すぐ打てるようにする
          autoFocus
          className="h-12 min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-muted"
        />
      </label>

      {failed && (
        <p className="mt-6 text-sm text-muted">索引を読めませんでした。開き直してください。</p>
      )}
      {!failed && query && !index && <p className="mt-6 text-sm text-muted">読み込んでいます…</p>}

      {found && found.producers.length + found.songs.length === 0 && (
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
