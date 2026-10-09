'use client';

import type { QueueItem } from '@/lib/catalog';
import { type FavoriteProducer, useFavoriteProducers, useFavorites } from '@/lib/favorites';
import { Icon } from './icon';

/**
 * お気に入りのハート。入っていれば塗りのハートを差し色で、入っていなければ線だけのハートを出す。
 * 曲の行の中に置くときは、行を押したときの動き（その曲を流す）に届かないよう、押しても外へ伝えない。
 *
 * quiet は一覧の行に置くとき。入れていない曲のハートは、マウスを載せた行（group）とキーボードで選んだときだけ出し、
 * マウスの無い端末（スマホ）では出さない。お気に入りは聴きながら再生の帯で入れるのが主で、
 * 一覧のハートは、いま流している曲を止めずに入れておくためのもの（Spotify と同じ形。2026-10-09）
 */
export function FavoriteButton({
  song,
  quiet = false,
  className = '',
}: {
  song: QueueItem;
  quiet?: boolean;
  className?: string;
}) {
  const { has, toggle } = useFavorites();
  const on = has(song.songId);
  const shown =
    quiet && !on
      ? 'hidden opacity-0 group-hover:opacity-100 focus-visible:opacity-100 [@media(hover:hover)]:grid'
      : 'grid';
  return (
    <button
      type="button"
      aria-label={on ? `${song.title}をお気に入りから外す` : `${song.title}をお気に入りに入れる`}
      aria-pressed={on}
      onClick={(e) => {
        e.stopPropagation();
        toggle(song);
      }}
      className={`${shown} size-9 shrink-0 place-items-center rounded-full transition-[color,scale,opacity] duration-150 ease-out hover:bg-foreground/8 active:scale-90 ${on ? 'text-accent' : 'text-muted hover:text-foreground'} ${className}`}
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
