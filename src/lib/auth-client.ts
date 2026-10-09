'use client';

import { createAuthClient } from 'better-auth/react';

/**
 * ログインの窓口（ブラウザの側）。ログインは任意なので、一度も呼ばなくてもサイトは動く。
 * セッションを取りに行っているあいだ、useSession はログイン中でも data が null になる。isPending を見てから判断する
 */
export const authClient = createAuthClient();

/**
 * この端末でログインしたことがある印。印の無い端末（ほとんどの人）は、セッションをサーバーに聞きに行かない。
 * 聞きに行くと、ログインしていない人でも画面を開くたびにサーバーの関数が1回動くため
 */
const HINT = 'vocafy-signed-in';

export function hasSignInHint(): boolean {
  try {
    return localStorage.getItem(HINT) !== null;
  } catch {
    return false;
  }
}

export function setSignInHint(on: boolean) {
  try {
    if (on) localStorage.setItem(HINT, '1');
    else localStorage.removeItem(HINT);
  } catch {
    // 残せなければ、次に開いたときにログインに気づかないだけ（設定の画面では気づく）
  }
}

/** Google でログインする。戻ってくる先は今の画面 */
export function signIn() {
  setSignInHint(true);
  return authClient.signIn.social({ provider: 'google', callbackURL: window.location.href });
}

export async function signOut() {
  await authClient.signOut();
  setSignInHint(false);
}
