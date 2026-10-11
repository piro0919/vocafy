'use client';

import { createLocalChoice } from '@/lib/local-flag';
import { THEME_KEY } from './theme-script';

/** 本人が選んだテーマ。system は端末の設定に合わせる */
export type ThemePref = 'system' | 'light' | 'dark';

const choice = createLocalChoice<ThemePref>({
  key: THEME_KEY,
  values: ['system', 'light', 'dark'],
  fallback: 'system',
  event: 'vocafy-theme-change',
});

export const readThemePref = choice.read;
export const subscribeThemePref = choice.subscribe;

export const systemDark = () => window.matchMedia('(prefers-color-scheme: dark)');

/** <html data-theme> を付け直す。描く前の初回は theme-script.ts が同じことをする */
export function applyTheme(pref: ThemePref) {
  const dark = pref === 'system' ? systemDark().matches : pref === 'dark';
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
}

export function setThemePref(pref: ThemePref) {
  choice.save(pref);
  applyTheme(pref);
  choice.notify();
}
