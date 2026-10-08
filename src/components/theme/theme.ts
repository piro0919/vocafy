'use client';

import { THEME_KEY } from './theme-script';

/** 本人が選んだテーマ。system は端末の設定に合わせる */
export type ThemePref = 'system' | 'light' | 'dark';

const CHANGE_EVENT = 'vocafy-theme-change';

export function readThemePref(): ThemePref {
  try {
    const v = localStorage.getItem(THEME_KEY);
    return v === 'light' || v === 'dark' ? v : 'system';
  } catch {
    return 'system';
  }
}

export function subscribeThemePref(onChange: () => void): () => void {
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener('storage', onChange);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener('storage', onChange);
  };
}

export const systemDark = () => window.matchMedia('(prefers-color-scheme: dark)');

/** <html data-theme> を付け直す。描く前の初回は theme-script.ts が同じことをする */
export function applyTheme(pref: ThemePref) {
  const dark = pref === 'system' ? systemDark().matches : pref === 'dark';
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
}

export function setThemePref(pref: ThemePref) {
  try {
    if (pref === 'system') localStorage.removeItem(THEME_KEY);
    else localStorage.setItem(THEME_KEY, pref);
  } catch {
    // 保存できない窓では、開き直すと端末の設定に戻る
  }
  applyTheme(pref);
  window.dispatchEvent(new Event(CHANGE_EVENT));
}
