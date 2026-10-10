'use client';

import Link from 'next/link';
import { useRouter } from '@bprogress/next/app';
import { usePathname } from 'next/navigation';
import { Suspense, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { loadIndex } from '@/lib/search-index';
import { AccountButton } from './account/account-button';
import { HeaderSearch, HeaderSearchFallback } from './header-search';
import { Icon } from './icon';
import { InstallButton } from './install-app';
import { Logo } from './nav';
import { ICON } from './button-styles';

const ICON_BUTTON = `grid ${ICON} text-muted hover:text-foreground`;

/** 虫めがねから検索の画面を開いたか。開いていれば ← で戻り、住所から直に開いたときはトップへ移る */
let openedFromSite = false;

/**
 * 上の帯の中身。スマホだけで出す（パソコンはロゴ・検索・アプリの案内が左のメニューにあり、上の帯は出さない）。
 * 左のメニューが出ないので、アイコンと虫めがねと歯車とログインを並べる（検索は下のタブに入りきらないのでここに置く）
 */
export function HeaderBar() {
  const pathname = usePathname();
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  // 虫めがねを押してから検索の画面に移りきるまでも、帯を検索欄にしておく
  const [opening, setOpening] = useState(false);
  if (opening && pathname === '/search') setOpening(false);

  // 検索の画面では、帯を ← と検索欄に変える（YouTube のアプリと同じ）
  if (opening || pathname === '/search') {
    return (
      <div className="flex w-full items-center gap-1 md:hidden">
        <button
          type="button"
          aria-label="戻る"
          className={ICON_BUTTON}
          onClick={() => {
            if (openedFromSite) router.back({ showProgress: false });
            else router.push('/');
            openedFromSite = false;
          }}
        >
          <Icon name="left" className="size-5" />
        </button>
        <div className="min-w-0 flex-1 pr-1">
          <Suspense fallback={<HeaderSearchFallback mobile />}>
            <HeaderSearch mobile inputRef={input} />
          </Suspense>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex w-full items-center gap-1 md:hidden">
        <Logo compact />
        <span className="flex-1" />
        <InstallButton className="md:hidden" />
        {/* 検索は下のタブに入りきらないので、上の帯に置く（YouTube のアプリと同じ） */}
        {/* 触れた時点で検索の索引を読み始める（src/lib/search-index.ts） */}
        {/*
          押した操作の中で欄を出して選ぶ。iPhone は押した操作の外で欄を選んでもキーボードを出さないので、
          画面が移ってから選ぶと、欄をもう一度押させることになる
        */}
        <button
          type="button"
          aria-label="検索"
          className={ICON_BUTTON}
          onPointerDown={() => void loadIndex().catch(() => {})}
          onClick={() => {
            flushSync(() => setOpening(true));
            input.current?.focus();
            openedFromSite = true;
            router.push('/search');
          }}
        >
          <Icon name="search" className="size-5" />
        </button>
        {/* スマホは左のメニューが出ないので、設定への入口を上の帯の右端に置く（YouTube Music のアプリと同じ） */}
        <Link href="/settings" aria-label="設定" className={ICON_BUTTON}>
          <Icon name="settings" className="size-5" />
        </Link>
        {/* ログインは右端に置く（YouTube と同じ） */}
        <AccountButton />
      </div>
    </>
  );
}
