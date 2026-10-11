'use client';

import { useSyncExternalStore } from 'react';
import { CheckRow, SettingSection } from '../setting-controls';
import { resumeEnabled, setResumeEnabled, subscribeResume } from './player-resume';

/**
 * 設定の画面の「開き直したとき」。前の曲（player-resume.ts）と、アプリから開いたときの前回の画面（page-restore.tsx）を
 * まとめて切り替える。前回の画面はアプリでしか効かないが、前の曲はブラウザでも効くので、いつも出す
 */
export function ResumeSetting() {
  const on = useSyncExternalStore(subscribeResume, resumeEnabled, () => true);
  return (
    <SettingSection eyebrow="Resume" title="開き直したとき">
      <CheckRow checked={on} onChange={setResumeEnabled}>
        前回の続きから始める
      </CheckRow>
    </SettingSection>
  );
}
