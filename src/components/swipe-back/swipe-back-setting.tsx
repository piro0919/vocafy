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
import { defineText } from '@/i18n/text';
import { useText } from '@/i18n/navigation';

type Choice = 'off' | RightEdge;

const TEXT = defineText({
  ja: {
    title: 'スワイプで戻る',
    off: '使わない',
    back: '画面の左右の端から戻る',
    forward: '画面の左端から戻る・右端から進む',
  },
  en: {
    title: 'Swipe to go back',
    off: 'Off',
    back: 'Swipe from either edge to go back',
    forward: 'Left edge to go back, right edge to go forward',
  },
});

const CHOICES: Choice[] = ['off', 'back', 'forward'];

/**
 * 設定の画面の「スワイプ」。iPhone・iPad でホーム画面から開いたときだけ出す（ブラウザには戻るボタンがあり、
 * Android はシステムの戻る操作が効く）。はじめは使わない。左端はいつも戻る。テーマと同じく1つの組から選ぶ
 */
export function SwipeBackSetting() {
  const shown = useClientValue(isIosStandalone, false);
  const on = useSyncExternalStore(subscribeSwipeBack, swipeBackEnabled, () => false);
  const right = useSyncExternalStore(subscribeSwipeBack, rightEdge, (): RightEdge => 'back');
  const t = useText(TEXT);
  if (!shown) return null;
  const choice: Choice = on ? right : 'off';
  const choose = (value: Choice) => {
    setSwipeBack(value !== 'off');
    if (value !== 'off') setRightEdge(value);
  };
  return (
    <SettingSection eyebrow="Swipe" title={t.title}>
      {(id) => (
        <RadioOptions
          name="swipe"
          labelledBy={id}
          options={CHOICES.map((value) => ({ value, label: t[value] }))}
          value={choice}
          onChange={choose}
        />
      )}
    </SettingSection>
  );
}
