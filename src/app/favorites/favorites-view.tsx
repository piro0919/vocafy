'use client';

import { FadeImage } from '@/components/fade-image';
import { FavoriteButton } from '@/components/favorite-button';
import { Icon } from '@/components/icon';
import { Marquee } from '@/components/marquee';
import { Bars } from '@/components/now-playing';
import { usePlayer } from '@/components/player/player-provider';
import { useFavorites } from '@/lib/favorites';
import { smallThumbOf } from '@/lib/thumb';

/**
 * お気に入りの一覧。足した順の新しいものが先。押した曲から、お気に入りの並びを順に流す
 * （ほかの一覧のようにボカロPの画面へは移らない。お気に入りを続けて聴くための画面なので）。
 * ハートを外した曲はその場で消える
 */
export function FavoritesView() {
  const { items } = useFavorites();
  const { current, playing, playQueue } = usePlayer();

  if (items.length === 0) {
    return (
      <p className="flex items-center gap-1.5 text-sm text-muted">
        曲の横の
        <Icon name="heart" className="size-4" />
        を押すと、ここに集まります。お気に入りはこのブラウザに残ります。
      </p>
    );
  }

  return (
    <>
      <div className="mb-4 flex items-center gap-3">
        <button
          type="button"
          onClick={() => playQueue(items, 0)}
          className="flex shrink-0 items-center gap-2 rounded-full bg-miku py-2 pr-5 pl-4 text-sm font-bold whitespace-nowrap text-on-miku shadow-lg shadow-miku/30 transition-[filter,scale] duration-150 ease-out hover:brightness-110 active:scale-95"
        >
          <Icon name="play" className="size-5" />
          再生
        </button>
        <span className="text-sm text-muted">{items.length} 曲</span>
      </div>
      <div className="grid gap-1 md:grid-cols-2 xl:grid-cols-3">
        {items.map((song, i) => {
          const active = current?.songId === song.songId;
          return (
            <div
              key={song.songId}
              className={`group flex min-w-0 items-center rounded-md pr-1 transition-colors duration-150 ${active ? 'bg-sidebar/60' : 'hover:bg-foreground/8'}`}
            >
              <button
                type="button"
                onClick={() => playQueue(items, i)}
                className="flex min-w-0 flex-1 items-center gap-3 p-1.5 text-left transition-[scale] duration-150 ease-out active:scale-[0.98]"
              >
                <FadeImage
                  src={smallThumbOf(song)}
                  alt=""
                  loading={i < 12 ? 'eager' : 'lazy'}
                  width={85}
                  height={48}
                  className="aspect-video shrink-0 rounded object-cover"
                />
                <span className="min-w-0">
                  <span className="flex items-center gap-1.5 text-sm font-bold">
                    <Marquee active={active}>{song.title}</Marquee>
                    {active && <Bars playing={playing} />}
                  </span>
                  <span className="block truncate text-xs text-muted">
                    {song.producerName}
                    {song.vocalists && ` ・ ${song.vocalists}`}
                  </span>
                </span>
              </button>
              <FavoriteButton song={song} />
            </div>
          );
        })}
      </div>
    </>
  );
}
