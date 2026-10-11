'use client';

import { useSyncExternalStore } from 'react';
import { RadioOptions, SettingSection } from '../setting-controls';
import { type DockSide, savedDockSide, saveDockSide, subscribeDockSide } from './player-storage';
import { defineText } from '@/i18n/text';
import { useText } from '@/i18n/navigation';

const TEXT = defineText({
  ja: { title: 'ミニプレーヤーの位置', right: '右', left: '左' },
  en: { title: 'Mini player position', right: 'Right', left: 'Left' },
});

const SIDES: DockSide[] = ['right', 'left'];

/**
 * 設定の画面の「ミニプレーヤーの位置」。ほかの画面で流しているときの小さな窓を、右と左のどちらに出すか。
 * 帯を横に引いても変えられる（dock-strip.tsx）が、見て分かる入り口はここ。スワイプの設定と同じく1つの組から選ぶ
 */
export function DockSetting() {
  const side = useSyncExternalStore(subscribeDockSide, savedDockSide, (): DockSide => 'right');
  const t = useText(TEXT);
  return (
    <SettingSection eyebrow="Player" title={t.title}>
      {(id) => (
        <RadioOptions
          name="dock"
          labelledBy={id}
          options={SIDES.map((value) => ({ value, label: t[value] }))}
          value={side}
          onChange={saveDockSide}
        />
      )}
    </SettingSection>
  );
}
