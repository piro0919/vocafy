'use client';

import type { QueueItem } from '@/lib/catalog';
import { type FavoriteProducer, useFavoriteProducers, useFavorites } from '@/lib/favorites';
import { type CSSProperties, useState } from 'react';
import { Icon } from './icon';

/** 飛び散る粒の向き（度）。8方向に散らし、1つおきに色を変える */
const PARTICLES = [0, 45, 90, 135, 180, 225, 270, 315];

/**
 * ハートと、押したときの動き。入れたときは弾んで粒が散り、外したときは小さく縮んで戻る。
 * 押すたびに key を変えて、動きを頭から流し直す（最初に開いたときは動かさない）
 */
function Heart({ on, beat, size }: { on: boolean; beat: number; size: string }) {
  return (
    <span key={beat} className="relative grid place-items-center">
      <Icon
        name={on ? 'heartFill' : 'heart'}
        className={`${size} ${beat === 0 ? '' : on ? 'animate-[heart-pop_480ms_ease-out]' : 'animate-[heart-unpop_180ms_ease-out]'}`}
      />
      {beat > 0 && on && (
        <span aria-hidden className="pointer-events-none absolute inset-0 grid place-items-center">
          <span className="absolute size-[180%] animate-[heart-ring_420ms_ease-out_forwards] rounded-full border-accent opacity-0" />
          {PARTICLES.map((angle, i) => (
            <span
              key={angle}
              className={`absolute size-2 animate-[heart-particle_600ms_cubic-bezier(0.2,0.7,0.3,1)_forwards] rounded-full ${i % 2 === 0 ? 'bg-accent' : 'bg-miku'}`}
              style={{ '--angle': `${angle}deg` } as CSSProperties}
            />
          ))}
        </span>
      )}
    </span>
  );
}

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
  const [beat, setBeat] = useState(0);
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
        setBeat((b) => b + 1);
      }}
      className={`${shown} size-9 shrink-0 place-items-center rounded-full transition-[color,scale,opacity] duration-150 ease-out hover:bg-foreground/8 active:scale-90 ${on ? 'text-accent' : 'text-muted hover:text-foreground'} ${className}`}
    >
      <Heart on={on} beat={beat} size="size-5" />
    </button>
  );
}

/** ボカロPのお気に入りのハート。ボカロPの画面の名前の横に置く。形と色は曲のハートと同じ */
export function FavoriteProducerButton({ producer }: { producer: FavoriteProducer }) {
  const { has, toggle } = useFavoriteProducers();
  const on = has(producer.id);
  const [beat, setBeat] = useState(0);
  return (
    <button
      type="button"
      aria-label={
        on ? `${producer.name}をお気に入りから外す` : `${producer.name}をお気に入りに入れる`
      }
      aria-pressed={on}
      onClick={() => {
        toggle(producer);
        setBeat((b) => b + 1);
      }}
      className={`grid size-10 shrink-0 place-items-center rounded-full transition-[color,scale] duration-150 ease-out hover:bg-foreground/8 active:scale-90 ${on ? 'text-accent' : 'text-muted hover:text-foreground'}`}
    >
      <Heart on={on} beat={beat} size="size-6" />
    </button>
  );
}
