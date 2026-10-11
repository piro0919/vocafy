'use client';

import { useSyncExternalStore } from 'react';
import { RadioOptions, SettingSection } from '../setting-controls';
import { readVisualizer, setVisualizer, subscribeVisualizer } from './visualizer-store';

const OPTIONS = [
  { value: false, label: '連携しない' },
  { value: true, label: '連携する' },
];

/** 設定の画面の「Vocafy Visualizer」。Mac のオマケのアプリに、流している曲の情報を送るか */
export function VisualizerSetting() {
  const on = useSyncExternalStore(subscribeVisualizer, readVisualizer, () => false);
  return (
    <SettingSection eyebrow="Visualizer" title="Vocafy Visualizer">
      {(id) => (
        <RadioOptions
          name="visualizer"
          labelledBy={id}
          options={OPTIONS}
          value={on}
          onChange={setVisualizer}
        />
      )}
    </SettingSection>
  );
}
