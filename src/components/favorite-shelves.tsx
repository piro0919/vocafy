'use client';

import { useFavoriteProducers, useFavorites } from '@/lib/favorites';
import { CoverCard } from './cover-card';
import { usePlayer } from './player/player-provider';
import { Shelf } from './shelf';
import { SongList } from './song-list';

/**
 * トップの一番上に出すお気に入りの棚（Janify と同じ）。お気に入りが無ければ何も出さない。
 * 曲はお気に入りの画面と同じく、押した曲からお気に入りの並びを順に流す
 */
export function FavoriteShelves() {
  const { items: songs } = useFavorites();
  const { items: producers } = useFavoriteProducers();
  const { playQueue } = usePlayer();
  if (songs.length + producers.length === 0) return null;
  return (
    // 下のきょうの日付の曲は、自分が先頭のつもりで上を詰めているので、ここで間を空ける
    <div className="mb-10 sm:mb-14">
      {songs.length > 0 && (
        <Shelf title="お気に入りの曲" eyebrow="Favorites" href="/favorites">
          <SongList songs={songs.slice(0, 24)} onOpen={(i) => playQueue(songs, i)} columns />
        </Shelf>
      )}
      {producers.length > 0 && (
        <Shelf title="お気に入りのボカロP" eyebrow="Favorite Producers" href="/favorites">
          {producers.slice(0, 20).map((p, i) => (
            <CoverCard
              key={p.id}
              href={`/producers/${p.id}`}
              playing={{ producerId: p.id }}
              cover={p.picture}
              round
              title={p.name}
              eager={i < 5}
              className="w-28 shrink-0 snap-start sm:w-36"
            />
          ))}
        </Shelf>
      )}
    </div>
  );
}
