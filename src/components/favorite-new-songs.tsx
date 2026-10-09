'use client';

import { useEffect, useState } from 'react';
import type { DatedItem } from '@/lib/catalog';
import { useFavoriteProducers } from '@/lib/favorites';
import { Heading, SECTION } from './heading';
import { SongList } from './song-list';

/** 新しい曲を読むボカロPの数（お気に入りに足した新しい順） */
const PRODUCERS = 12;
/** 棚に出す曲の数 */
const SONGS = 12;
/** 1人のボカロPから読む曲の数（/api/latest/[producer] が返す数） */
const PER_PRODUCER = 6;

/**
 * トップの「お気に入りのボカロPの新曲」。お気に入りに入れたボカロPの新しい曲を、投稿の新しい順に混ぜて並べる。
 * お気に入りはブラウザの中にあるので、トップの作り置きには入れられず、ブラウザで /api/latest/[producer] から集める。
 * お気に入りのボカロPがいない人には何も出さない（その人のトップは今までと変わらない）。
 * トップは人気で並べずフラットにすると決めているが、これは来るたびに中身が変わる、その人だけの棚なので置く
 */
export function FavoriteNewSongs() {
  const { items: producers } = useFavoriteProducers();
  const ids = producers.slice(0, PRODUCERS).map((p) => p.id);
  const key = ids.join(',');
  const [loaded, setLoaded] = useState<{ key: string; songs: DatedItem[] } | null>(null);

  useEffect(() => {
    if (!key) return;
    let current = true;
    Promise.all(
      key.split(',').map((id) =>
        fetch(`/api/latest/${id}`)
          .then((res) => (res.ok ? (res.json() as Promise<DatedItem[]>) : []))
          .catch(() => [] as DatedItem[]),
      ),
    ).then((lists) => {
      if (!current) return;
      const seen = new Set<number>();
      const songs = lists
        .flat()
        .filter((s) => (seen.has(s.songId) ? false : (seen.add(s.songId), true)))
        .toSorted((a, b) => b.publishedOn.localeCompare(a.publishedOn))
        .slice(0, SONGS);
      setLoaded({ key, songs });
    });
    return () => {
      current = false;
    };
  }, [key]);

  const songs = loaded?.key === key ? loaded.songs : null;
  // お気に入りのボカロPがいない人、読み終えて曲が無かった人には出さない
  if (!key || songs?.length === 0) return null;
  return (
    <section className={SECTION} aria-busy={!songs}>
      <div className="mb-3">
        <Heading eyebrow="From Your Favorites">お気に入りのボカロPの新曲</Heading>
      </div>
      {songs ? (
        <SongList songs={songs} className="grid gap-1 md:grid-cols-2 xl:grid-cols-3" />
      ) : (
        // 読み込むあいだは、曲の行の形だけを並べて場所を取っておく。読み終えたときに下の区画が押し下がらないように
        <div aria-hidden className="grid gap-1 md:grid-cols-2 xl:grid-cols-3">
          {/* 読み終えたときと同じ数（多くて SONGS 曲）を並べ、高さを合わせる */}
          {Array.from({ length: Math.min(SONGS, ids.length * PER_PRODUCER) }, (_, i) => (
            <div key={i} className="flex items-center gap-3 p-1.5">
              <span className="aspect-video w-[85px] shrink-0 animate-pulse rounded bg-surface" />
              <span className="flex min-w-0 flex-1 flex-col gap-1.5">
                <span className="h-3.5 w-2/3 animate-pulse rounded bg-surface" />
                <span className="h-3 w-1/2 animate-pulse rounded bg-surface/70" />
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
