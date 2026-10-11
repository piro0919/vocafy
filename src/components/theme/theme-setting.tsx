'use client';

import { useSyncExternalStore } from 'react';
import { RadioOptions, SettingSection } from '../setting-controls';
import { defineText } from '@/i18n/text';
import { useText } from '@/i18n/navigation';
import { readThemePref, setThemePref, subscribeThemePref, type ThemePref } from './theme';

const TEXT = defineText({
  ja: {
    title: 'テーマ',
    system: '端末の設定に合わせる',
    light: '明るいテーマ',
    dark: '暗いテーマ',
  },
  en: { title: 'Theme', system: 'Match device setting', light: 'Light', dark: 'Dark' },
});

const PREFS: ThemePref[] = ['system', 'light', 'dark'];

/** 設定の画面のテーマの選択。選んだ時点で切り替わり、このブラウザに残る */
export function ThemeSetting() {
  const pref = useSyncExternalStore(subscribeThemePref, readThemePref, () => 'system' as const);
  const t = useText(TEXT);
  return (
    <SettingSection eyebrow="Theme" title={t.title}>
      {(id) => (
        <RadioOptions
          name="theme"
          labelledBy={id}
          options={PREFS.map((value) => ({ value, label: t[value] }))}
          value={pref}
          onChange={setThemePref}
        />
      )}
    </SettingSection>
  );
}
