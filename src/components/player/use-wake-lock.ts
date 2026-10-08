'use client';

import { useEffect } from 'react';

/**
 * 流している間は、スマホの画面を自動で消させない（Wake Lock API）。画面が消えると YouTube の埋め込みは止まるので、
 * 机に置いて流しっぱなしにする使い方のため。nagara-kaigo の録音（use-audio-recorder.ts）と同じく、
 * 取れない端末や断られたときは黙って諦める。
 * 別のアプリに切り替えるとブラウザが外すので、戻ってきたときにまだ流していれば取り直す
 */
export function useWakeLock(active: boolean): void {
  useEffect(() => {
    if (!active || !('wakeLock' in navigator)) return;
    let lock: WakeLockSentinel | null = null;
    let done = false;

    const request = async () => {
      if (document.visibilityState !== 'visible' || lock) return;
      try {
        const next = await navigator.wakeLock.request('screen');
        // 取れるのを待つあいだに止めていたら、すぐ返す
        if (done) void next.release();
        else {
          lock = next;
          next.addEventListener('release', () => {
            if (lock === next) lock = null;
          });
        }
      } catch {
        // 何もしない
      }
    };

    void request();
    document.addEventListener('visibilitychange', request);
    return () => {
      done = true;
      document.removeEventListener('visibilitychange', request);
      void lock?.release();
      lock = null;
    };
  }, [active]);
}
