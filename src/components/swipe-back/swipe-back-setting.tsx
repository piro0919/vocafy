'use client';

import { useSyncExternalStore } from 'react';
import { Heading, SECTION } from '../heading';
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

type Choice = 'off' | RightEdge;

const OPTIONS: { value: Choice; label: string }[] = [
  { value: 'off', label: '使わない' },
  { value: 'back', label: '左右の端で戻る' },
  { value: 'forward', label: '左端で戻る・右端で進む' },
];

/**
 * 設定の画面の「スワイプ」。iPhone・iPad でホーム画面から開いたときだけ出す（ブラウザには戻るボタンがあり、
 * Android はシステムの戻る操作が効く）。はじめは使わない。左端はいつも戻る。テーマと同じく1つの組から選ぶ
 */
export function SwipeBackSetting() {
  const shown = useSyncExternalStore(noop, isIosStandalone, () => false);
  const on = useSyncExternalStore(subscribeSwipeBack, swipeBackEnabled, () => false);
  const right = useSyncExternalStore(subscribeSwipeBack, rightEdge, (): RightEdge => 'back');
  if (!shown) return null;
  const choice: Choice = on ? right : 'off';
  const choose = (value: Choice) => {
    setSwipeBack(value !== 'off');
    if (value !== 'off') setRightEdge(value);
  };
  return (
    <section className={SECTION}>
      <div className="mb-3">
        <Heading id="swipe-setting" eyebrow="Swipe">
          スワイプ
        </Heading>
      </div>
      <div role="radiogroup" aria-labelledby="swipe-setting" className="grid gap-1">
        {OPTIONS.map((o) => (
          <label
            key={o.value}
            className="flex cursor-pointer items-center gap-3 rounded-md px-3 py-2.5 transition-colors duration-react hover:bg-hover"
          >
            <input
              type="radio"
              name="swipe"
              value={o.value}
              checked={choice === o.value}
              onChange={() => choose(o.value)}
              className="size-4 accent-accent"
            />
            {o.label}
          </label>
        ))}
      </div>
    </section>
  );
}
