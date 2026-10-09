'use client';

import type { QueueItem } from '@/lib/catalog';
import { type FavoriteProducer, useFavoriteProducers, useFavorites } from '@/lib/favorites';
import { Icon } from './icon';

/**
 * お気に入りのハート。入っていれば塗りのハートを差し色で、入っていなければ線だけのハートを出す。
 * 曲の行の中に置くときは、行を押したときの動き（その曲を流す）に届かないよう、押しても外へ伝えない
 */
export function FavoriteButton({ song, className = '' }: { song: QueueItem; className?: string }) {
  const { has, toggle } = useFavorites();
  const on = has(song.songId);
  return (
    <button
      type="button"
      aria-label={on ? `${song.title}をお気に入りから外す` : `${song.title}をお気に入りに入れる`}
      aria-pressed={on}
      onClick={(e) => {
        e.stopPropagation();
        toggle(song);
      }}
      className={`grid size-9 shrink-0 place-items-center rounded-full transition-[color,scale] duration-150 ease-out hover:bg-foreground/8 active:scale-90 ${on ? 'text-accent' : 'text-muted hover:text-foreground'} ${className}`}
    >
      <Icon name={on ? 'heartFill' : 'heart'} className="size-5" />
    </button>
  );
}

/** ボカロPのお気に入りのハート。ボカロPの画面の名前の横に置く。形と色は曲のハートと同じ */
export function FavoriteProducerButton({ producer }: { producer: FavoriteProducer }) {
  const { has, toggle } = useFavoriteProducers();
  const on = has(producer.id);
  return (
    <button
      type="button"
      aria-label={
        on ? `${producer.name}をお気に入りから外す` : `${producer.name}をお気に入りに入れる`
      }
      aria-pressed={on}
      onClick={() => toggle(producer)}
      className={`grid size-10 shrink-0 place-items-center rounded-full transition-[color,scale] duration-150 ease-out hover:bg-foreground/8 active:scale-90 ${on ? 'text-accent' : 'text-muted hover:text-foreground'}`}
    >
      <Icon name={on ? 'heartFill' : 'heart'} className="size-6" />
    </button>
  );
}
