'use client';

import Link from 'next/link';
import { Icon } from './icon';
import { InstallButton } from './install-app';
import { Logo } from './nav';

const ICON_BUTTON =
  'grid size-10 shrink-0 place-items-center rounded-full text-muted transition-colors hover:text-foreground';

/**
 * 上の帯の中身。スマホだけで出す（パソコンはロゴ・検索・アプリの案内が左のメニューにあり、上の帯は出さない）。
 * 左のメニューが出ないので、アイコンと虫めがねと歯車を並べる（検索は下のタブに入りきらないのでここに置く）
 */
export function HeaderBar() {
  return (
    <>
      <div className="flex w-full items-center gap-1 md:hidden">
        <Logo compact />
        <span className="flex-1" />
        <InstallButton className="md:hidden" />
        {/* 検索は下のタブに入りきらないので、上の帯に置く（YouTube のアプリと同じ） */}
        <Link href="/search" aria-label="検索" className={ICON_BUTTON}>
          <Icon name="search" className="size-5" />
        </Link>
        {/* スマホは左のメニューが出ないので、設定への入口を上の帯の右端に置く（YouTube Music のアプリと同じ） */}
        <Link href="/settings" aria-label="設定" className={ICON_BUTTON}>
          <Icon name="settings" className="size-5" />
        </Link>
      </div>
    </>
  );
}
