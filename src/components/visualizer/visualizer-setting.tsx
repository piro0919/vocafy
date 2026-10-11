'use client';

import { useSyncExternalStore } from 'react';
import { RadioOptions, SettingSection } from '../setting-controls';
import { readVisualizer, setVisualizer, subscribeVisualizer } from './visualizer-store';
import { defineText } from '@/i18n/text';
import { useText } from '@/i18n/navigation';

const TEXT = defineText({
  ja: { off: '連携しない', on: '連携する' },
  en: { off: "Don't connect", on: 'Connect' },
});

/** 設定の画面の「Vocafy Visualizer」。Mac のオマケのアプリに、流している曲の情報を送るか */
export function VisualizerSetting() {
  const on = useSyncExternalStore(subscribeVisualizer, readVisualizer, () => false);
  const t = useText(TEXT);
  return (
    <SettingSection eyebrow="Visualizer" title="Vocafy Visualizer">
      {(id) => (
        <RadioOptions
          name="visualizer"
          labelledBy={id}
          options={[
            { value: false, label: t.off },
            { value: true, label: t.on },
          ]}
          value={on}
          onChange={setVisualizer}
        />
      )}
    </SettingSection>
  );
}
