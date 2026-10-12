'use client';

import { useSyncExternalStore } from 'react';
import { RadioOptions, SettingSection } from '../setting-controls';
import { choosesPv, savedPvChoice, savePvChoice, subscribePvChoice } from './pv-choice';
import { defineText } from '@/i18n/text';
import { useText } from '@/i18n/navigation';

const TEXT = defineText({
  ja: {
    title: 'YouTube に PV が無い曲',
    youtube: 'YouTube の音源で再生する',
    niconico: 'ニコニコの PV で再生する',
  },
  en: {
    title: 'Songs without a PV on YouTube',
    youtube: 'Play the YouTube audio',
    niconico: 'Play the PV on Niconico',
  },
});

/**
 * 設定の画面の「YouTube に PV が無い曲」。YouTube には配信の音源の静止画しか無く、ニコニコに PV がある曲をどちらで流すか（pv-choice.ts）。
 * iPad・iPhone ではいつも YouTube で流すので出さない
 */
export function PvSetting() {
  const shown = useSyncExternalStore(subscribePvChoice, choosesPv, () => false);
  const niconico = useSyncExternalStore(subscribePvChoice, savedPvChoice, () => false);
  const t = useText(TEXT);
  if (!shown) return null;
  return (
    <SettingSection eyebrow="Video" title={t.title}>
      {(id) => (
        <RadioOptions
          name="pv"
          labelledBy={id}
          options={[
            { value: false, label: t.youtube },
            { value: true, label: t.niconico },
          ]}
          value={niconico}
          onChange={savePvChoice}
        />
      )}
    </SettingSection>
  );
}
