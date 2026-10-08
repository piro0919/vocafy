import Link from 'next/link';
import { voiceColor } from '@/lib/voice-color';

/** 歌声の札。キャラの色の丸と、その色を薄く混ぜた地。トップと歌声の一覧で使う */
export function VoiceCard({
  id,
  name,
  songCount,
}: {
  id: number;
  name: string;
  songCount: number;
}) {
  return (
    <Link
      href={`/voices/${id}`}
      style={{ '--c': voiceColor(name) } as React.CSSProperties}
      className="flex h-full items-center gap-3 rounded-2xl border border-line/60 bg-[color-mix(in_oklab,var(--c)_14%,var(--sidebar))] px-3 py-2.5 transition-[background-color,scale] duration-150 ease-out hover:bg-[color-mix(in_oklab,var(--c)_24%,var(--sidebar))] active:scale-95"
    >
      <span aria-hidden className="size-7 shrink-0 rounded-full bg-(--c) shadow-sm" />
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
