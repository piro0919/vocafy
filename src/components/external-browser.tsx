'use client';

import { useEffect } from 'react';
import { externalBrowserUrl, withoutExternalParam } from '@/lib/in-app-browser';

/**
 * LINE の中のブラウザで開かれたら、外のブラウザで開き直す（in-app-browser.ts）。
 * 外のブラウザで開いたあとは、住所に残った印を外す。開いた最初の1回だけ見る
 */
export function ExternalBrowser() {
  useEffect(() => {
    const external = externalBrowserUrl(location.href, navigator.userAgent);
    if (external) {
      location.replace(external);
      return;
    }
    const clean = withoutExternalParam(location.href);
    if (clean) history.replaceState(history.state, '', clean);
  }, []);
  return null;
}
