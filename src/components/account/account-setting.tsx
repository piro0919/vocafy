'use client';

import Image from 'next/image';
import { authClient, signIn, signOut } from '@/lib/auth-client';
import { setSignedIn } from '@/lib/favorites';

/**
 * 設定の画面のアカウントの欄。ログインは任意で、手段は Google だけ。
 * ログインすると、お気に入りが端末をまたいで同じになる。ログアウトしても、この端末のお気に入りは残る
 */
export function AccountSetting() {
  const { data, isPending } = authClient.useSession();
  const user = data?.user;
  return (
    <section className="mt-7 sm:mt-10">
      <h2 className="mb-1 font-bold">アカウント</h2>
      <p className="mb-3 text-sm text-muted">
        ログインすると、お気に入りがほかの端末でも同じになります。ログインしなくても使えます。
      </p>
      {isPending ? (
        <div className="h-11" />
      ) : user ? (
        <div className="flex items-center gap-3">
          {user.image && (
            <Image
              src={user.image}
              alt=""
              width={36}
              height={36}
              unoptimized
              className="size-9 rounded-full"
            />
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold">{user.name}</p>
            <p className="truncate text-xs text-muted">{user.email}</p>
          </div>
          <button
            type="button"
            onClick={() => signOut().then(() => setSignedIn(false))}
            className="rounded-full border border-line px-4 py-2 text-sm font-bold transition-[background-color,scale] duration-150 ease-out hover:bg-foreground/8 active:scale-95"
          >
            ログアウト
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => signIn()}
          className="flex items-center gap-2 rounded-full bg-miku py-2.5 pr-5 pl-4 text-sm font-bold text-on-miku shadow-lg shadow-miku/30 transition-[filter,scale] duration-150 ease-out hover:brightness-110 active:scale-95"
        >
          Google でログイン
        </button>
      )}
    </section>
  );
}
