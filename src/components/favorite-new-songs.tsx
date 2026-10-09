'use client';

import { useEffect, useState } from 'react';
import type { DatedItem } from '@/lib/catalog';
import { useFavoriteProducers } from '@/lib/favorites';
import { Heading } from './heading';
import { SongList } from './song-list';

/** 新しい曲を読むボカロPの数（お気に入りに足した新しい順） */
const PRODUCERS = 12;
/** 棚に出す曲の数 */
const SONGS = 12;

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
  if (!key || !songs || songs.length === 0) return null;
  return (
    <section className="mt-10 sm:mt-14">
      <div className="mb-3">
        <Heading eyebrow="From Your Favorites">お気に入りのボカロPの新曲</Heading>
      </div>
      <SongList songs={songs} className="grid gap-1 md:grid-cols-2 xl:grid-cols-3" />
    </section>
  );
}
