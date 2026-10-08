import Link from 'next/link';
import { voiceArt } from '@/lib/voice-art';
import { voiceColor } from '@/lib/voice-color';
import { FadeImage } from './fade-image';

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
          <FadeImage src={art} alt="" fill unoptimized className="object-contain object-bottom" />
        </span>
      </span>
      <span className="relative min-w-0 px-3 pt-1.5 pb-2.5">
        <span className="block truncate text-sm font-bold">{name}</span>
        <span className="block text-xs text-muted">{songCount} 曲</span>
      </span>
    </Link>
  );
}

/** 歌声の札。キャラの色を薄く混ぜた地に、絵のある歌声は小さな絵、無い歌声は色の丸。歌声の一覧で使う */
export function VoiceCard({ id, name, songCount }: VoiceProps) {
  const art = voiceArt(id);
  return (
    <Link
      href={`/voices/${id}`}
      style={{ '--c': voiceColor(name) } as React.CSSProperties}
      className="flex h-full items-center gap-3 rounded-2xl border border-line/60 bg-[color-mix(in_oklab,var(--c)_14%,var(--sidebar))] px-3 py-2.5 transition-[background-color,scale] duration-150 ease-out hover:bg-[color-mix(in_oklab,var(--c)_24%,var(--sidebar))] active:scale-95"
    >
      {art ? (
        <span className="relative -my-1 size-9 shrink-0 rounded-full bg-(--c)/45">
          <FadeImage src={art} alt="" fill unoptimized className="object-contain" />
        </span>
      ) : (
        <span aria-hidden className="size-7 shrink-0 rounded-full bg-(--c) shadow-sm" />
      )}
      <span className="min-w-0">
        <span className="block truncate text-sm font-bold">{name}</span>
        <span className="block text-xs text-muted">{songCount} 曲</span>
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
      <span className="mt-1 text-xs text-muted">{count} 曲</span>
    </Link>
  );
}

/** 見出しの右に置く「すべて表示」 */
export function MoreLink({ href }: { href: string }) {
  return (
    <Link
      href={href}
      className="rounded-full border border-accent/40 bg-sidebar/60 px-3 py-1 text-xs font-bold text-accent transition-[background-color,scale] duration-150 ease-out hover:bg-accent/10 active:scale-95"
    >
      すべて表示
    </Link>
  );
}
