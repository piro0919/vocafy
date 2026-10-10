'use client';

import { useSyncExternalStore } from 'react';
import { Heading, SECTION } from '../heading';
import { resumeEnabled, setResumeEnabled, subscribeResume } from './player-resume';

/**
 * 設定の画面の「開き直したとき」。前の曲（player-resume.ts）と、アプリから開いたときの前回の画面（page-restore.tsx）を
 * まとめて切り替える。前回の画面はアプリでしか効かないが、前の曲はブラウザでも効くので、いつも出す
 */
export function ResumeSetting() {
  const on = useSyncExternalStore(subscribeResume, resumeEnabled, () => true);
  return (
    <section className={SECTION}>
      <div className="mb-3">
        <Heading eyebrow="Resume">開き直したとき</Heading>
      </div>
      {/* 行の形は、歌っているキャラの色に変えるの切り替えと同じ */}
      <label className="flex cursor-pointer items-start gap-3 rounded-md px-3 py-2.5 transition-colors duration-react hover:bg-hover sm:max-w-sm">
        <input
          type="checkbox"
          checked={on}
          onChange={() => setResumeEnabled(!on)}
          className="mt-1 size-4 shrink-0 accent-accent"
        />
        <span>前回の続きから始める</span>
      </label>
    </section>
  );
}
