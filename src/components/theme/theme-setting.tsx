'use client';

import { useSyncExternalStore } from 'react';
import { Heading } from '../heading';
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
    // 見出しはほかの画面の区画と同じ部品。ラジオの組の名前は、見出しを aria-labelledby で指す
    <section>
      <div className="mb-3">
        <Heading id="theme-setting" eyebrow="Theme">
          テーマ
        </Heading>
      </div>
      <div role="radiogroup" aria-labelledby="theme-setting" className="grid gap-1">
        {OPTIONS.map((o) => (
          <label
            key={o.value}
            className="flex cursor-pointer items-center gap-3 rounded-md px-3 py-2.5 transition-colors duration-react hover:bg-hover"
          >
            <input
              type="radio"
              name="theme"
              value={o.value}
              checked={pref === o.value}
              onChange={() => setThemePref(o.value)}
              className="size-4 accent-accent"
            />
            {o.label}
          </label>
        ))}
      </div>
    </section>
  );
}
