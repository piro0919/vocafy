'use client';

import { useSyncExternalStore } from 'react';
import { CheckRow, SettingSection } from '../setting-controls';
import { resumeEnabled, setResumeEnabled, subscribeResume } from './player-resume';
import { defineText } from '@/i18n/text';
import { useText } from '@/i18n/navigation';

const TEXT = defineText({
  ja: { title: '開き直したとき', resume: '前回の続きから始める' },
  en: { title: 'When reopening', resume: 'Pick up where you left off' },
});

/**
 * 設定の画面の「開き直したとき」。前の曲（player-resume.ts）と、アプリから開いたときの前回の画面（page-restore.tsx）を
 * まとめて切り替える。前回の画面はアプリでしか効かないが、前の曲はブラウザでも効くので、いつも出す
 */
export function ResumeSetting() {
  const on = useSyncExternalStore(subscribeResume, resumeEnabled, () => true);
  const t = useText(TEXT);
  return (
    <SettingSection eyebrow="Resume" title={t.title}>
      <CheckRow checked={on} onChange={setResumeEnabled}>
        {t.resume}
      </CheckRow>
    </SettingSection>
  );
}
