'use client';

import { ProgressProvider } from '@bprogress/next/app';
import type { ReactNode } from 'react';

/**
 * ページを移るあいだ、画面の上端に差し色の細い線を出す（@bprogress/next）。回る印は出さない。
 * 検索欄に打つたびに URL の語だけが変わるので、同じページの中の移動（shallowRouting）では出さない。
 * 拾えるのはリンクを押したときだけなので、コードから移るときは next/navigation でなく @bprogress/next/app の useRouter を使う。
 * 戻る・進むは移り終えるのを待たずにすぐ線を消すので、showProgress: false で出さない（ブラウザの戻るでも出ない）
 */
export function Progress({ children }: { children: ReactNode }) {
  return (
    <ProgressProvider
      height="2px"
      color="var(--accent)"
      options={{ showSpinner: false }}
      shallowRouting
    >
      {children}
    </ProgressProvider>
  );
}
