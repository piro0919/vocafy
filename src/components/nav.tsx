'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Icon, type IconName } from './icon';
import { InstallButton } from './install-app';

const ITEMS: { href: string; label: string; icon: IconName }[] = [
  { href: '/', label: 'ホーム', icon: 'home' },
  { href: '/producers', label: 'ボカロP', icon: 'artist' },
  { href: '/voices', label: '歌声', icon: 'voice' },
  { href: '/years', label: '年代', icon: 'year' },
  { href: '/favorites', label: 'お気に入り', icon: 'favorites' },
];

/**
 * 左のメニューにだけ足す項目。下のタブは5つで埋まっているので、スマホの履歴はお気に入りの画面の題名の横から行く
 */
const SIDEBAR_ITEMS = [
  ...ITEMS,
  { href: '/history', label: '履歴', icon: 'history' },
] satisfies typeof ITEMS;

function useActive() {
  const pathname = usePathname();
  return (href: string) => (href === '/' ? pathname === '/' : pathname.startsWith(href));
}

/** ロゴ。開いたときに一度だけ、マウスを載せるともう一度、きらめきが字の上を走る（globals.css の .logo） */
export function Logo({ compact }: { compact?: boolean }) {
  return (
    <Link href="/" aria-label="Vocafy ホーム" className="flex items-center gap-2">
      {/*
        アプリのアイコンと同じ影絵を、地のタイル無しで添える。タイルに入れたままだと 28px では人物が潰れるので、
        人物だけを切り出した絵（src/assets/icon-source.png から切り出した public/logo-mark.png）を大きめに置く
      */}
      <Image src="/logo-mark.png" alt="" width={43} height={36} priority />
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
 * 本文の上に重ねて置き、横に流す棚の画像が後ろを通るとき、すりガラス越しに透けて見えるようにする。
 * 本文は板の幅（w-63）だけ右から始める（layout.tsx）。棚だけは画面の左端まで伸ばす（shelf.tsx）。
 * 下の帯が出ているあいだは、板の下端が帯に隠れないよう、帯の高さ（4rem）と帯の下の間（0.75rem）と板の間（0.75rem）の分だけ下を空ける
 */
export function Sidebar() {
  const active = useActive();
  return (
    <nav className="fixed inset-y-0 left-0 z-30 hidden w-63 py-3 pl-3 transition-[padding] duration-300 md:flex [html[data-player=dock]_&]:pb-[5.5rem] [html[data-player=slot]_&]:pb-[5.5rem]">
      <div className="flex flex-1 flex-col gap-1 rounded-2xl border border-line/60 bg-glass px-3 pt-4 shadow-lg shadow-black/5 backdrop-blur-lg backdrop-saturate-150">
        <div className="mb-5 px-3">
          <Logo />
        </div>
        {SIDEBAR_ITEMS.map((item) => (
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
          {/* パソコンは上の帯を出さないので、アプリの案内はここに置く（出せるときだけ出る） */}
          <InstallButton menu />
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
    <nav className="chrome-tabs fixed inset-x-3 bottom-3 z-40 grid h-14 grid-cols-5 rounded-2xl border border-line/60 bg-glass shadow-lg shadow-black/5 backdrop-blur-lg backdrop-saturate-150 md:hidden">
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
