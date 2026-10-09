'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { FadeImage } from '@/components/fade-image';
import { Icon } from '@/components/icon';
import { SongList } from '@/components/song-list';
import type { QueueItem, SearchIndex } from '@/lib/catalog';
import { normalize, normalizeRomaji, score } from '@/lib/search';
import { thumbOf } from '@/lib/thumb';

/** 一度に出す曲の数。それより多く当たったときは、言葉を足して絞ってもらう */
const SONG_LIMIT = 100;
const PRODUCER_LIMIT = 12;

/** 索引に、探すための正規化した文字を足したもの */
type Prepared = {
  producers: { id: number; name: string; picture: string | null; songCount: number; key: string }[];
  /** title と romaji は探すための形。romaji はローマ字の曲名が無ければ空 */
  songs: { item: QueueItem; title: string; romaji: string; producer: string }[];
};

/** 索引は画面を移っても一度だけ読む */
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
      return {
        producers: list,
        songs: songs.map(([songId, title, at, videoId, niconicoThumb, romaji]) => {
          const p = list[at];
          return {
            item: {
              songId,
              title,
              service: niconicoThumb ? ('niconico' as const) : ('youtube' as const),
              videoId,
              thumb: niconicoThumb ?? thumbOf(videoId),
              producerId: p.id,
              producerName: p.name,
              vocalists: '',
            },
            title: normalize(title),
            romaji: romaji ? normalizeRomaji(romaji) : '',
            producer: p.key,
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
    // 曲名で当たった曲を先に、ボカロP名だけで当たった曲を後にする。同じ当たり方の中は新しい順（索引の並び）
    const songs = index.songs
      .map((s) => ({
        s,
        // 曲名（ローマ字の曲名も含む）で当たれば先、ボカロP名だけなら後
        rank:
          Math.max(score(s.title, query), score(s.romaji, query)) * 2 || score(s.producer, query),
      }))
      .filter((x) => x.rank > 0)
      .toSorted((a, b) => b.rank - a.rank)
      .map((x) => x.s.item);
    return { producers, songs };
  }, [index, query]);

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
          <SongList
            songs={found.songs.slice(0, SONG_LIMIT)}
            className="grid gap-1 md:grid-cols-2 xl:grid-cols-3"
          />
        </section>
      )}
    </div>
  );
}
