'use client';

import { useSyncExternalStore } from 'react';
import { RadioOptions, SettingSection } from '../setting-controls';
import { type DockSide, savedDockSide, saveDockSide, subscribeDockSide } from './player-storage';

const OPTIONS: { value: DockSide; label: string }[] = [
  { value: 'right', label: '右' },
  { value: 'left', label: '左' },
];

/**
 * 設定の画面の「ミニプレーヤーの位置」。ほかの画面で流しているときの小さな窓を、右と左のどちらに出すか。
 * 帯を横に引いても変えられる（dock-strip.tsx）が、見て分かる入り口はここ。スワイプの設定と同じく1つの組から選ぶ
 */
export function DockSetting() {
  const side = useSyncExternalStore(subscribeDockSide, savedDockSide, (): DockSide => 'right');
  return (
    <SettingSection eyebrow="Player" title="ミニプレーヤーの位置">
      {(id) => (
        <RadioOptions
          name="dock"
          labelledBy={id}
          options={OPTIONS}
          value={side}
          onChange={saveDockSide}
        />
      )}
    </SettingSection>
  );
}
