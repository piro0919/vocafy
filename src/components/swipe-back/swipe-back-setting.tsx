'use client';

import { useSyncExternalStore } from 'react';
import { RadioOptions, SettingSection } from '../setting-controls';
import {
  type RightEdge,
  rightEdge,
  setRightEdge,
  setSwipeBack,
  subscribeSwipeBack,
  swipeBackEnabled,
} from './swipe-back-store';
import { useClientValue } from '@/lib/client-value';
import { isIosStandalone } from '@/lib/standalone';

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
  const shown = useClientValue(isIosStandalone, false);
  const on = useSyncExternalStore(subscribeSwipeBack, swipeBackEnabled, () => false);
  const right = useSyncExternalStore(subscribeSwipeBack, rightEdge, (): RightEdge => 'back');
  if (!shown) return null;
  const choice: Choice = on ? right : 'off';
  const choose = (value: Choice) => {
    setSwipeBack(value !== 'off');
    if (value !== 'off') setRightEdge(value);
  };
  return (
    <SettingSection eyebrow="Swipe" title="スワイプ">
      {(id) => (
        <RadioOptions
          name="swipe"
          labelledBy={id}
          options={OPTIONS}
          value={choice}
          onChange={choose}
        />
      )}
    </SettingSection>
  );
}
