import Link from 'next/link';
import { voiceColor } from '@/lib/voice-color';
import { FadeImage } from './fade-image';
import { formatCount } from '@/lib/format';

type VoiceProps = { id: number; name: string; songCount: number };

/**
 * キャラの絵の札。トップの歌声の区画で使う。札の下側だけをキャラの色の台にし、キャラはその上に立たせて、
 * 腰から上を台の上へ出す（キャラ選択の画面のような見せ方）。台より上は地を塗らず、縁の線も引かない。
 * 暗い画面では、地に混ぜる色が暗く濁るので、キャラの色を多めに混ぜる。
 * 絵は元から 400px の webp なので、Vercel の画像変換は通さない
 */
export function CharacterCard({ id, name, songCount, art }: VoiceProps & { art: string }) {
  return (
    <Link
      href={`/voices/${id}`}
      style={{ '--c': voiceColor(name) } as React.CSSProperties}
      className="group relative flex h-full flex-col transition-[scale] duration-150 ease-out active:scale-95"
    >
      <span
        aria-hidden
        className="absolute inset-x-0 top-[42%] bottom-0 rounded-2xl bg-[color-mix(in_oklab,var(--c)_30%,var(--sidebar))] shadow-[inset_0_1px_0_rgb(255_255_255/0.35)] transition-[background-color] duration-150 ease-out group-hover:bg-[color-mix(in_oklab,var(--c)_42%,var(--sidebar))] dark:bg-[color-mix(in_oklab,var(--c)_48%,var(--sidebar))] dark:group-hover:bg-[color-mix(in_oklab,var(--c)_60%,var(--sidebar))]"
      />
      <span className="relative block aspect-square">
        {/* 背丈をそろえるため、絵の枠を左右に広げる。横に広いキャラ（ミクのツインテールなど）が札の幅で縮まないように、
            髪は隣との間へはみ出してよい。z-10 で隣の札より手前に出す。並べる側で、列と列の間を空ける */}
        <span className="absolute inset-x-[-12%] top-0 bottom-0 z-10 origin-bottom transition-[scale,translate] duration-200 ease-out group-hover:-translate-y-1 group-hover:scale-105">
          {/* ぼかさずにずらしただけの影で、ステッカーのように浮かせる。色はキャラの色を暗くしたもの */}
          <FadeImage
            src={art}
            alt=""
            fill
            unoptimized
            className="object-contain object-bottom drop-shadow-[3px_4px_0_color-mix(in_oklab,var(--c)_55%,black)]"
          />
        </span>
      </span>
      <span className="relative min-w-0 px-3 pt-1.5 pb-2.5">
        <span className="block truncate text-sm font-bold">{name}</span>
        <span className="block text-xs text-muted">{formatCount(songCount)} 曲</span>
      </span>
    </Link>
  );
}

/** 年の札。トップの棚と年代の一覧で使う。幅は置く側で決める */
export function YearCard({
  year,
  count,
  className = '',
}: {
  year: number;
  count: number;
  className?: string;
}) {
  return (
    <Link
      href={`/years/${year}`}
      className={`flex flex-col items-start rounded-2xl border border-line/60 bg-sidebar/60 px-4 py-3 transition-[background-color,border-color,scale] duration-150 ease-out hover:border-accent/50 hover:bg-accent/10 active:scale-95 ${className}`}
    >
      <span className="font-tech text-2xl font-black text-accent sm:text-3xl">{year}</span>
      <span className="mt-1 text-xs text-muted">{formatCount(count)} 曲</span>
    </Link>
  );
}

/** 小さな丸いボタンの形。「すべて表示」と右上のログインで同じ形を使う */
export const PILL =
  'shrink-0 rounded-full border border-accent/40 bg-sidebar/60 px-3 py-1 text-xs font-bold text-accent transition-[background-color,scale] duration-150 ease-out hover:bg-accent/10 active:scale-95';

/** 見出しの右に置く「すべて表示」 */
export function MoreLink({ href }: { href: string }) {
  return (
    <Link href={href} className={PILL}>
      すべて表示
    </Link>
  );
}
