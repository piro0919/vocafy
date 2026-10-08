'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Icon, type IconName } from './icon';

const ITEMS: { href: string; label: string; icon: IconName }[] = [
  { href: '/', label: 'ホーム', icon: 'home' },
  { href: '/producers', label: 'ボカロP', icon: 'artist' },
];

function useActive() {
  const pathname = usePathname();
  return (href: string) => (href === '/' ? pathname === '/' : pathname.startsWith(href));
}

/** ロゴ。開いたときに一度だけ、マウスを載せるともう一度、きらめきが字の上を走る（globals.css の .logo） */
export function Logo({ compact }: { compact?: boolean }) {
  return (
    <Link href="/" aria-label="Vocafy ホーム" className="flex items-center gap-2">
      {/* アプリのアイコン（src/app/icon.png と同じ絵）を、角を丸めたタイルとして添える */}
      <Image
        src="/icon-192x192.png"
        alt=""
        width={28}
        height={28}
        className="rounded-md"
        priority
      />
      {/* スマホの上の帯では、検索の虫めがねと歯車を並べるので、アイコンだけにする */}
      {!compact && (
        <span className="logo text-2xl">
          <span>Voca</span>
          <span className="text-accent">fy</span>
        </span>
      )}
    </Link>
  );
}

/**
 * パソコンの幅で左に置くメニュー。半透明にして、ボカロPの画面の色の背景を透かし、画面全体を一つの色合いにする。
 * 下の帯が出ているあいだは、一番下の「設定」が隠れないよう余白を足す
 */
export function Sidebar() {
  const active = useActive();
  return (
    <nav className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col gap-1 border-r border-line/60 bg-sidebar/60 px-3 pt-4 backdrop-blur-lg backdrop-saturate-150 transition-[padding] duration-300 md:flex [html[data-player=dock]_&]:pb-16 [html[data-player=slot]_&]:pb-16">
      <div className="mb-5 px-3">
        <Logo />
      </div>
      {ITEMS.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={`flex items-center gap-4 rounded-lg px-3 py-2.5 text-sm font-bold transition-colors duration-150 ${
            active(item.href)
              ? 'bg-foreground/10 text-foreground'
              : 'text-muted hover:text-foreground'
          }`}
        >
          <Icon name={item.icon} />
          {item.label}
        </Link>
      ))}
      {/* YouTube と同じく、設定は左のメニューの下の方に置く */}
      <div className="mt-auto py-3">
        <Link
          href="/settings"
          className={`flex items-center gap-4 rounded-lg px-3 py-2.5 text-sm font-bold transition-colors duration-150 ${
            active('/settings')
              ? 'bg-foreground/10 text-foreground'
              : 'text-muted hover:text-foreground'
          }`}
        >
          <Icon name="settings" />
          設定
        </Link>
      </div>
    </nav>
  );
}

/** スマホの幅で下に置くタブ */
export function MobileTabs() {
  const active = useActive();
  return (
    <nav className="chrome-tabs fixed inset-x-0 bottom-0 z-40 grid h-14 grid-cols-2 border-t border-line/60 bg-sidebar/60 backdrop-blur-lg backdrop-saturate-150 md:hidden">
      {ITEMS.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={`flex flex-col items-center justify-center gap-0.5 text-[10px] font-bold ${
            active(item.href) ? 'text-foreground' : 'text-muted'
          }`}
        >
          <Icon name={item.icon} className="size-5" />
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
