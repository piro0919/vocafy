'use client';

import { useSyncExternalStore } from 'react';
import { Heading, SECTION } from '../heading';
import { readVisualizer, setVisualizer, subscribeVisualizer } from './visualizer-store';

const OPTIONS = [
  { value: false, label: '連携しない' },
  { value: true, label: '連携する' },
];

/** 設定の画面の「Vocafy Visualizer」。Mac のオマケのアプリに、流している曲の情報を送るか */
export function VisualizerSetting() {
  const on = useSyncExternalStore(subscribeVisualizer, readVisualizer, () => false);
  return (
    <section className={SECTION}>
      <div className="mb-3">
        <Heading id="visualizer-setting" eyebrow="Visualizer">
          Vocafy Visualizer
        </Heading>
      </div>
      <div role="radiogroup" aria-labelledby="visualizer-setting" className="grid gap-1">
        {OPTIONS.map((o) => (
          <label
            key={o.label}
            className="flex cursor-pointer items-center gap-3 rounded-md px-3 py-2.5 transition-colors duration-react hover:bg-hover"
          >
            <input
              type="radio"
              name="visualizer"
              checked={on === o.value}
              onChange={() => setVisualizer(o.value)}
              className="size-4 accent-accent"
            />
            {o.label}
          </label>
        ))}
      </div>
    </section>
  );
}
