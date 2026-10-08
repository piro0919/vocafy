'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Icon } from './icon';
import { InstallButton } from './install-app';
import { Logo } from './nav';

const ICON_BUTTON =
  'grid size-10 shrink-0 place-items-center rounded-full text-muted transition-colors hover:text-foreground';

/**
 * 上の帯の中身。パソコンは検索欄の形をした入口と、右端にインストールの案内（ロゴは左のメニューにある）。
 * スマホは左のメニューが出ないので、アイコンと虫めがねと歯車を並べる。
 * 検索の入口はどれも検索の画面へ移るだけで、打つのは移った先の欄（search-view.tsx）
 */
export function HeaderBar() {
  // 検索の画面では、画面の中に検索欄があるので、上の帯の入口は出さない
  const searching = usePathname() === '/search';
  return (
    <>
      <div className="hidden w-full items-center gap-3 md:flex">
        <Link
          href="/search"
          className={`flex h-10 w-full max-w-sm items-center gap-2 rounded-full border border-line/60 bg-sidebar/60 px-4 text-sm text-muted transition-colors hover:border-accent/50 hover:text-foreground ${searching ? 'invisible' : ''}`}
        >
          <Icon name="search" className="size-4 shrink-0" />
          曲名・ボカロPで探す
        </Link>
        <span className="flex-1" />
        <InstallButton />
      </div>
      <div className="flex w-full items-center gap-1 md:hidden">
        <Logo compact />
        <span className="flex-1" />
        <InstallButton className="md:hidden" />
        {!searching && (
          <Link href="/search" aria-label="検索" className={ICON_BUTTON}>
            <Icon name="search" className="size-5" />
          </Link>
        )}
        {/* スマホは左のメニューが出ないので、設定への入口を上の帯の右端に置く（YouTube Music のアプリと同じ） */}
        <Link href="/settings" aria-label="設定" className={ICON_BUTTON}>
          <Icon name="settings" className="size-5" />
        </Link>
      </div>
    </>
  );
}
