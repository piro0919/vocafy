'use client';

import { useSyncExternalStore } from 'react';
import { isMouseDevice, mixFlowEnabled, setMixFlowEnabled, subscribeMixFlow } from '@/lib/mix-flow';
import { Heading, SECTION } from './heading';

/**
 * 設定の画面の「トップの動き」。きょうの出会いの壁を流すかを切り替える（2026-10-11 に本人と決めた）。
 * 壁の横に止めるボタンを置くと、「再生」の隣で曲を止めるボタンと取り違えるので、設定の画面に置いた。
 * 壁が流れるのはマウスの端末だけなので、ほかの端末では出さない
 */
export function MixFlowSetting() {
  const shown = useSyncExternalStore(subscribeMixFlow, isMouseDevice, () => false);
  const on = useSyncExternalStore(subscribeMixFlow, mixFlowEnabled, () => true);
  if (!shown) return null;
  return (
    <section className={SECTION}>
      <div className="mb-3">
        <Heading eyebrow="Motion">トップの動き</Heading>
      </div>
      {/* 行の形は、開き直したときの切り替えと同じ */}
      <label className="flex cursor-pointer items-start gap-3 rounded-md px-3 py-2.5 transition-colors duration-react hover:bg-hover sm:max-w-sm">
        <input
          type="checkbox"
          checked={on}
          onChange={() => setMixFlowEnabled(!on)}
          className="mt-1 size-4 shrink-0 accent-accent"
        />
        <span>きょうの出会いを流す</span>
      </label>
    </section>
  );
}
