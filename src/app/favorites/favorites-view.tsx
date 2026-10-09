'use client';

import type { ReactNode } from 'react';
import { ARTIST_GRID, CoverCard } from '@/components/cover-card';
import { Heading } from '@/components/heading';
import { Icon } from '@/components/icon';
import { usePlayer } from '@/components/player/player-provider';
import { SongList } from '@/components/song-list';
import { useFavoriteProducers, useFavorites } from '@/lib/favorites';

/**
 * お気に入りの曲とボカロP（Janify のライブラリと同じ組み立て）。どちらも足した順の新しいものが先。
 * 曲は、押した曲からお気に入りの並びを順に流す（ほかの一覧のようにボカロPの画面へは移らない。
 * お気に入りを続けて聴くための画面なので）。ハートを外した曲はその場で消える
 */
export function FavoritesView() {
  const { items: songs } = useFavorites();
  const { items: producers } = useFavoriteProducers();
  const { playQueue } = usePlayer();

  if (songs.length + producers.length === 0) {
    return (
      <p className="flex flex-wrap items-center gap-1.5 text-sm text-muted">
        お気に入りはまだありません。曲やボカロPの
        <Icon name="heart" className="size-4" />
        で追加できます。
      </p>
    );
  }

  return (
    // 包んで、先頭の区画の上の余白（first:mt-0）が効くようにする。包まないと先頭はページの見出しになる
    <div>
      {songs.length > 0 && (
        <Section title="曲" eyebrow="Songs" count={`${songs.length} 曲`}>
          <button
            type="button"
            onClick={() => playQueue(songs, 0)}
            className="mb-4 flex shrink-0 items-center gap-2 rounded-full bg-miku py-2 pr-5 pl-4 text-sm font-bold whitespace-nowrap text-on-miku shadow-lg shadow-miku/30 transition-[filter,scale] duration-150 ease-out hover:brightness-110 active:scale-95"
          >
            <Icon name="play" className="size-5" />
            再生
          </button>
          <SongList
            songs={songs}
            onOpen={(i) => playQueue(songs, i)}
            className="grid gap-1 md:grid-cols-2 xl:grid-cols-3"
          />
        </Section>
      )}
      {producers.length > 0 && (
        <Section title="ボカロP" eyebrow="Producers" count={`${producers.length} 人`}>
          <div className={ARTIST_GRID}>
            {producers.map((p, i) => (
              <CoverCard
                key={p.id}
                href={`/producers/${p.id}`}
                playing={{ producerId: p.id }}
                cover={p.picture}
                round
                title={p.name}
                eager={i < 10}
              />
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}

function Section({
  title,
  eyebrow,
  count,
  children,
}: {
  title: string;
  eyebrow: string;
  count: string;
  children: ReactNode;
}) {
  return (
    <section className="mt-7 first:mt-0 sm:mt-10 sm:first:mt-0">
      <div className="mb-3 flex items-end gap-3">
        <Heading eyebrow={eyebrow}>{title}</Heading>
        <span className="pb-1 text-sm text-muted">{count}</span>
      </div>
      {children}
    </section>
  );
}
