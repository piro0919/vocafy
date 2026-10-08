'use client';

import { useEffect, useSyncExternalStore } from 'react';
import { applyTheme, readThemePref, subscribeThemePref, systemDark } from './theme';

/** 端末に合わせているあいだは、開いている途中で端末の設定が変わってもそれに付いていく。何も描かない */
export function ThemeWatcher() {
  const pref = useSyncExternalStore(subscribeThemePref, readThemePref, () => 'system' as const);
  useEffect(() => {
    if (pref !== 'system') return;
    const media = systemDark();
    const onChange = () => applyTheme('system');
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, [pref]);
  return null;
}
