'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useId, useSyncExternalStore } from 'react';
import { authClient, hasSignInHint, signIn, signOut } from '@/lib/auth-client';
import { setSignedIn } from '@/lib/favorites';
import { ICON, PRIMARY_TEXT } from '@/components/button-styles';

function LoginButton() {
  return (
    <button type="button" onClick={() => signIn()} className={PRIMARY_TEXT}>
      ログイン
    </button>
  );
}

/** ログイン中の顔写真と、押すと開くメニュー（名前・設定・ログアウト）。開閉はブラウザの popover に任せる */
function SessionAccount() {
  const { data, isPending } = authClient.useSession();
  const id = useId();
  const user = data?.user;
  if (isPending) return <span className="size-8 shrink-0" />;
  if (!user) return <LoginButton />;
  return (
    <>
      <button type="button" popoverTarget={id} aria-label="アカウント" className={`grid ${ICON}`}>
        {user.image ? (
          <Image
            src={user.image}
            alt=""
            width={32}
            height={32}
            unoptimized
            className="size-8 rounded-full"
          />
        ) : (
          <span className="grid size-8 place-items-center rounded-full bg-miku text-sm font-bold text-on-miku">
            {user.name.slice(0, 1)}
          </span>
        )}
      </button>
      <div
        id={id}
        popover="auto"
        className="fixed inset-auto top-18 right-3 m-0 w-64 rounded-2xl border border-line/60 bg-glass p-2 text-foreground shadow-float backdrop-blur-lg backdrop-saturate-150 md:right-3"
      >
        <div className="px-3 py-2">
          <p className="truncate text-sm font-bold">{user.name}</p>
          <p className="truncate text-xs text-muted">{user.email}</p>
        </div>
        <Link
          href="/settings"
          onClick={() => document.getElementById(id)?.hidePopover()}
          className="block rounded-md px-3 py-2 text-sm font-bold text-muted transition-colors hover:bg-hover hover:text-foreground"
        >
          設定
        </Link>
        <button
          type="button"
          onClick={() => {
            document.getElementById(id)?.hidePopover();
            void signOut().then(() => setSignedIn(false));
          }}
          className="block w-full rounded-md px-3 py-2 text-left text-sm font-bold text-muted transition-colors hover:bg-hover hover:text-foreground"
        >
          ログアウト
        </button>
      </div>
    </>
  );
}

/**
 * 右上のログイン（Spotify・YouTube と同じ置き場所）。スマホは上の帯の右端、パソコンは本文の右上に置く。
 * ログインしたことのない端末（ほとんどの人）はセッションを聞きに行かず、ログインのボタンだけを出す（auth-client.ts の印）
 */
export function AccountButton() {
  const hinted = useSyncExternalStore(
    () => () => {},
    hasSignInHint,
    () => false,
  );
  return hinted ? <SessionAccount /> : <LoginButton />;
}
