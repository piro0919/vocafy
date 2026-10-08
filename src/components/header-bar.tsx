'use client';

import Link from 'next/link';
import { Icon } from './icon';
import { InstallButton } from './install-app';
import { Logo } from './nav';

const ICON_BUTTON =
  'grid size-10 shrink-0 place-items-center rounded-full text-muted transition-colors hover:text-foreground';

/**
 * 上の帯の中身。パソコンは右端にインストールの案内だけ（ロゴと検索は左のメニューにある）。
 * スマホは左のメニューが出ないので、アイコンと歯車を並べる（検索は下のタブにある）
 */
export function HeaderBar() {
  return (
    <>
      <div className="hidden w-full items-center gap-3 md:flex">
        <span className="flex-1" />
        <InstallButton />
      </div>
      <div className="flex w-full items-center gap-1 md:hidden">
        <Logo compact />
        <span className="flex-1" />
        <InstallButton className="md:hidden" />
        {/* スマホは左のメニューが出ないので、設定への入口を上の帯の右端に置く（YouTube Music のアプリと同じ） */}
        <Link href="/settings" aria-label="設定" className={ICON_BUTTON}>
          <Icon name="settings" className="size-5" />
        </Link>
      </div>
    </>
  );
}
