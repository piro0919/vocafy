'use client';

import { useEffect } from 'react';
import { authClient, hasSignInHint, setSignInHint } from '@/lib/auth-client';
import { localFavoriteIds, replaceFavorites, setSignedIn } from '@/lib/favorites';

/** その端末のお気に入りを、そのユーザーのアカウントに足し終えた印。ユーザーごとに1回だけ足す */
const mergedKey = (userId: string) => `vocafy-favorites-merged-${userId}`;

/**
 * ログインしているあいだ、お気に入りをアカウントと合わせる。画面には何も出さない（layout.tsx に置く）。
 * その端末で初めてログインしたときは、手元のお気に入りをアカウントに足してから、アカウントの中身を写す。
 * 2回目からは、開くたびにアカウントの中身を写す（別の端末で押したぶんを取り込む）。
 *
 * ログインしたことのある端末（auth-client.ts の印）だけがセッションを聞きに行く。
 * 聞いているあいだに押したぶんも送れるよう、印があればログインしているものとして先に扱う
 */
export function AccountSync() {
  useEffect(() => {
    if (!hasSignInHint()) return;
    setSignedIn(true);
    let cancelled = false;
    (async () => {
      const { data } = await authClient.getSession();
      const userId = data?.user.id;
      if (!userId) {
        // セッションが切れていた。次からは聞きに行かない
        setSignInHint(false);
        setSignedIn(false);
        return;
      }
      let merged = false;
      try {
        merged = localStorage.getItem(mergedKey(userId)) !== null;
      } catch {
        // 印を読めなければ、足し直す（足すのは重ねても同じ結果になる）
      }
      const res = merged
        ? await fetch('/api/favorites')
        : await fetch('/api/favorites', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(localFavoriteIds()),
          });
      if (cancelled || !res.ok) return;
      replaceFavorites(await res.json());
      try {
        localStorage.setItem(mergedKey(userId), new Date().toISOString());
      } catch {
        // 残せなければ、次も足し直すだけ
      }
    })().catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
