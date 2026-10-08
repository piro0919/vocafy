'use client';

import { useSyncExternalStore } from 'react';
import {
  isIosStandalone,
  type RightEdge,
  rightEdge,
  setRightEdge,
  setSwipeBack,
  subscribeSwipeBack,
  swipeBackEnabled,
} from './swipe-back-store';

const noop = () => () => {};

const RIGHT_OPTIONS: { value: RightEdge; label: string }[] = [
  { value: 'back', label: '戻る' },
  { value: 'forward', label: '進む' },
];

/**
 * 設定の画面の「スワイプで戻る」。iPhone・iPad でホーム画面から開いたときだけ出す（ブラウザには戻るボタンがあり、
 * Android はシステムの戻る操作が効く）。はじめはオフ。ON にすると、右端で戻るか進むかを選べる（左端はいつも戻る）
 */
export function SwipeBackSetting() {
  const shown = useSyncExternalStore(noop, isIosStandalone, () => false);
  const on = useSyncExternalStore(subscribeSwipeBack, swipeBackEnabled, () => false);
  const right = useSyncExternalStore(subscribeSwipeBack, rightEdge, (): RightEdge => 'back');
  if (!shown) return null;
  return (
    <section className="mt-7 sm:mt-10">
      <h2 className="mb-1 font-bold">スワイプで戻る</h2>
      <p className="mb-3 text-sm text-muted">
        画面の左端から右へなぞると、前の画面に戻ります。横に流れる棚の上では働きません。
      </p>
      <label className="flex cursor-pointer items-center gap-3 rounded-md px-3 py-2.5 transition-colors duration-150 hover:bg-foreground/8">
        <input
          type="checkbox"
          checked={on}
          onChange={() => setSwipeBack(!on)}
          className="size-4 accent-accent"
        />
        使う
      </label>
      <fieldset disabled={!on} className="mt-2 disabled:opacity-40">
        <legend className="mb-1 px-3 text-sm text-muted">右端から左へなぞったとき</legend>
        <div className="grid gap-1">
          {RIGHT_OPTIONS.map((o) => (
            <label
              key={o.value}
              className="flex cursor-pointer items-center gap-3 rounded-md px-3 py-2.5 transition-colors duration-150 hover:bg-foreground/8"
            >
              <input
                type="radio"
                name="swipe-right"
                value={o.value}
                checked={right === o.value}
                onChange={() => setRightEdge(o.value)}
                className="size-4 accent-accent"
              />
              {o.label}
            </label>
          ))}
        </div>
      </fieldset>
    </section>
  );
}
