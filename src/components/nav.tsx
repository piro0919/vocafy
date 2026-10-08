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
 * パソコンの幅で左に置くメニュー。画面の端から上・左・下を離し、角を丸めた板として浮かせる。
 * 半透明にして、ボカロPの画面の色の背景を透かし、画面全体を一つの色合いにする。
 * 下の帯が出ているあいだは、板の下端が帯に隠れないよう、帯の高さ（4rem）の分だけ下を空ける
 */
export function Sidebar() {
  const active = useActive();
  return (
    <nav className="sticky top-0 hidden h-dvh w-63 shrink-0 py-3 pl-3 transition-[padding] duration-300 md:flex [html[data-player=dock]_&]:pb-19 [html[data-player=slot]_&]:pb-19">
      <div className="flex flex-1 flex-col gap-1 rounded-2xl border border-line/60 bg-sidebar/60 px-3 pt-4 shadow-lg shadow-black/5 backdrop-blur-lg backdrop-saturate-150">
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
      </div>
    </nav>
  );
}

/**
 * スマホの幅で下に置くタブ。画面の端から左右と下を離し、角を丸めた板として浮かせる。
 * 再生の帯が出ているあいだは、帯がこの上に載って一枚の板に見えるよう、上の角と上の線を消す（globals.css）
 */
export function MobileTabs() {
  const active = useActive();
  return (
    <nav className="chrome-tabs fixed inset-x-3 bottom-3 z-40 grid h-14 grid-cols-2 rounded-2xl border border-line/60 bg-sidebar/60 shadow-lg shadow-black/5 backdrop-blur-lg backdrop-saturate-150 md:hidden">
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
