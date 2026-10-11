'use client';

import { useSyncExternalStore } from 'react';
import { RadioOptions, SettingSection } from '../setting-controls';
import { readThemePref, setThemePref, subscribeThemePref, type ThemePref } from './theme';

const OPTIONS: { value: ThemePref; label: string }[] = [
  { value: 'system', label: '端末の設定に合わせる' },
  { value: 'light', label: '明るいテーマ' },
  { value: 'dark', label: '暗いテーマ' },
];

/** 設定の画面のテーマの選択。選んだ時点で切り替わり、このブラウザに残る */
export function ThemeSetting() {
  const pref = useSyncExternalStore(subscribeThemePref, readThemePref, () => 'system' as const);
  return (
    // 設定の画面の一番上の区画
    <SettingSection eyebrow="Theme" title="テーマ" first>
      {(id) => (
        <RadioOptions
          name="theme"
          labelledBy={id}
          options={OPTIONS}
          value={pref}
          onChange={setThemePref}
        />
      )}
    </SettingSection>
  );
}
