'use client';

import Image from 'next/image';
import { Link, useText } from '@/i18n/navigation';
import { defineText } from '@/i18n/text';
import { TERMS } from '@/i18n/terms';
import { type ReactNode, useId } from 'react';
import { authClient, hasSignInHint, signIn, signOut } from '@/lib/auth-client';
import { clearLocalFavorites, setSignedIn } from '@/lib/favorites';
import { HEADER_ICON, ICON_SM, PRIMARY_TEXT } from '@/components/button-styles';
import { Icon } from '@/components/icon';
import { IMAGE_SIZES } from '@/lib/image-sizes';
import { useClientValue } from '@/lib/client-value';
import { GLASS_PANEL, MENU_ROW } from '@/components/surface-styles';

const TEXT = defineText({ ja: { account: 'アカウント' }, en: { account: 'Account' } });

/** compact はスマホの上の帯。文字のボタンでは帯の幅に収まらないので、人型のアイコンにする（YouTube のアプリと同じ） */
function LoginButton({ compact }: { compact?: boolean }) {
  const term = useText(TERMS);
  if (compact) {
    return (
      <button
        type="button"
        onClick={() => signIn()}
        aria-label={term.signIn}
        className={`grid ${HEADER_ICON}`}
      >
        <Icon name="account" className="size-5" />
      </button>
    );
  }
  return (
    <button type="button" onClick={() => signIn()} className={PRIMARY_TEXT}>
      {term.signIn}
    </button>
  );
}

/** ログイン中の顔写真と、押すと開くメニュー（名前・設定・ログアウト）。開閉はブラウザの popover に任せる */
function SessionAccount({ compact }: { compact?: boolean }) {
  const { data, isPending } = authClient.useSession();
  const id = useId();
  const t = useText(TEXT);
  const term = useText(TERMS);
  const user = data?.user;
  if (isPending) return <span className="size-9 shrink-0" />;
  if (!user) return <LoginButton compact={compact} />;
  return (
    <>
      <button type="button" popoverTarget={id} aria-label={t.account} className={`grid ${ICON_SM}`}>
        {user.image ? (
          <Image
            src={user.image}
            alt=""
            width={IMAGE_SIZES.account}
            height={IMAGE_SIZES.account}
            unoptimized
            className="size-9 rounded-full"
          />
        ) : (
          <span className="grid size-9 place-items-center rounded-full bg-miku text-sm font-bold text-on-miku">
            {user.name.slice(0, 1)}
          </span>
        )}
      </button>
      <div
        id={id}
        popover="auto"
        className={`${GLASS_PANEL} fixed inset-auto top-(--below-header) right-gutter m-0 w-64 p-2 text-foreground md:right-3`}
      >
        <div className="px-3 py-2">
          <p className="truncate text-sm font-bold">{user.name}</p>
          <p className="truncate text-xs text-muted">{user.email}</p>
        </div>
        <Link
          href="/settings"
          onClick={() => document.getElementById(id)?.hidePopover()}
          className={`block ${MENU_ROW}`}
        >
          {term.settings}
        </Link>
        <button
          type="button"
          onClick={() => {
            document.getElementById(id)?.hidePopover();
            void signOut().then(() => {
              setSignedIn(false);
              clearLocalFavorites();
            });
          }}
          className={`block w-full ${MENU_ROW}`}
        >
          {term.signOut}
        </button>
      </div>
    </>
  );
}

/**
 * 右上のログイン（Spotify・YouTube と同じ置き場所）。スマホは上の帯の右端、パソコンは本文の右上に置く。
 * ログインしたことのない端末（ほとんどの人）はセッションを聞きに行かず、ログインのボタンだけを出す（auth-client.ts の印）
 */
export function AccountButton({ compact }: { compact?: boolean }) {
  const hinted = useClientValue(hasSignInHint, false);
  return hinted ? <SessionAccount compact={compact} /> : <LoginButton compact={compact} />;
}

function SessionSignedOut({ children }: { children: ReactNode }) {
  const { data, isPending } = authClient.useSession();
  // 聞いているあいだは出さない。印のある端末はたいていログイン中なので、出してから消すより、あとから出す方が揺れが少ない
  if (isPending || data?.user) return null;
  return children;
}

/**
 * ログインしていないときだけ中身を出す。スマホの上の帯の歯車に使う（2026-10-12 に本人と決めた）。
 * ログイン中は顔写真のメニューに設定があるので、入口を一つにする（YouTube のアプリと同じ）。
 * セッションを聞くのは、ログインしたことのある端末だけ（AccountButton と同じ）
 */
export function SignedOutOnly({ children }: { children: ReactNode }) {
  const hinted = useClientValue(hasSignInHint, false);
  return hinted ? <SessionSignedOut>{children}</SessionSignedOut> : children;
}
