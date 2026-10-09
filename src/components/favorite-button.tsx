'use client';

import type { QueueItem } from '@/lib/catalog';
import { type FavoriteProducer, useFavoriteProducers, useFavorites } from '@/lib/favorites';
import { type CSSProperties, useState } from 'react';
import { Icon } from './icon';

/**
 * 舞い散る音符。向き（度。0 が真上）と傾きと形。上に3つ散らし、真ん中だけ連桁の音符にする。6つでは派手すぎた。
 * 点を散らすだけだと、どのサイトにもある「いいね」の動きでボカロらしさが無かった（2026-10-09）
 */
const NOTES = [
  { angle: -55, tilt: -12, beamed: false },
  { angle: 0, tilt: 8, beamed: true },
  { angle: 55, tilt: 12, beamed: false },
];

/** 12px の音符。beamed なら連桁の2つ（♫）、でなければ八分音符（♪） */
function Note({ beamed }: { beamed: boolean }) {
  return (
    <svg viewBox="0 0 12 12" fill="currentColor" className="size-3">
      {beamed ? (
        <>
          <ellipse cx="3" cy="10" rx="2.4" ry="1.8" transform="rotate(-20 3 10)" />
          <ellipse cx="9.2" cy="9" rx="2.4" ry="1.8" transform="rotate(-20 9.2 9)" />
          <rect x="4.5" y="2.4" width="1.2" height="7.6" rx="0.6" />
          <rect x="10.6" y="1.4" width="1.2" height="7.6" rx="0.6" />
          <path d="M4.5 2.4 11.8 1.2v2.1L4.5 4.5z" />
        </>
      ) : (
        <>
          <ellipse cx="4.2" cy="9.6" rx="2.8" ry="2.1" transform="rotate(-20 4.2 9.6)" />
          <rect x="6.2" y="1.2" width="1.3" height="8.6" rx="0.6" />
          <path d="M7.4 1.2c.4 1.8 2.9 2.4 3 4.8-.8-1.3-1.8-1.8-3-1.9z" />
        </>
      )}
    </svg>
  );
}

/**
 * ハートと、押したときの動き。入れたときは弾んで音符が舞い、外したときは小さく縮んで戻る。
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
          {NOTES.map(({ angle, tilt, beamed }, i) => (
            <span
              key={angle}
              className={`absolute animate-[heart-note_700ms_cubic-bezier(0.2,0.7,0.3,1)_forwards] opacity-0 ${i % 2 === 0 ? 'text-accent' : 'text-miku'}`}
              style={{ '--angle': `${angle}deg`, '--tilt': `${tilt}deg` } as CSSProperties}
            >
              <Note beamed={beamed} />
            </span>
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
