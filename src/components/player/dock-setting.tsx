'use client';

import { useSyncExternalStore } from 'react';
import { Heading, SECTION } from '../heading';
import { type DockSide, savedDockSide, saveDockSide, subscribeDockSide } from './player-storage';

const OPTIONS: { value: DockSide; label: string }[] = [
  { value: 'right', label: '右' },
  { value: 'left', label: '左' },
];

/**
 * 設定の画面の「ミニプレーヤーの位置」。ほかの画面で流しているときの小さな窓を、右と左のどちらに出すか。
 * 帯を横に引いても変えられる（dock-strip.tsx）が、見て分かる入り口はここ。スワイプの設定と同じく1つの組から選ぶ
 */
export function DockSetting() {
  const side = useSyncExternalStore(subscribeDockSide, savedDockSide, (): DockSide => 'right');
  return (
    <section className={SECTION}>
      <div className="mb-3">
        <Heading id="dock-setting" eyebrow="Player">
          ミニプレーヤーの位置
        </Heading>
      </div>
      <div role="radiogroup" aria-labelledby="dock-setting" className="grid gap-1">
        {OPTIONS.map((o) => (
          <label
            key={o.value}
            className="flex cursor-pointer items-center gap-3 rounded-md px-3 py-2.5 transition-colors duration-react hover:bg-hover"
          >
            <input
              type="radio"
              name="dock"
              value={o.value}
              checked={side === o.value}
              onChange={() => saveDockSide(o.value)}
              className="size-4 accent-accent"
            />
            {o.label}
          </label>
        ))}
      </div>
    </section>
  );
}
