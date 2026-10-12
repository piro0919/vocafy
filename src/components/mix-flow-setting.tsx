'use client';

import { useSyncExternalStore } from 'react';
import { isMouseDevice, mixFlowEnabled, setMixFlowEnabled, subscribeMixFlow } from '@/lib/mix-flow';
import { CheckRow, SettingSection } from './setting-controls';
import { defineText } from '@/i18n/text';
import { useText } from '@/i18n/navigation';

const TEXT = defineText({
  ja: { title: 'トップの動き', flow: 'きょうの出会いを自動でスクロールする' },
  en: { title: 'Home motion', flow: 'Auto-scroll Daily Mix' },
});

/**
 * 設定の画面の「トップの動き」。きょうの出会いの壁を流すかを切り替える（2026-10-11 に本人と決めた）。
 * 壁の横に止めるボタンを置くと、「再生」の隣で曲を止めるボタンと取り違えるので、設定の画面に置いた。
 * 壁が流れるのはマウスの端末だけなので、ほかの端末では出さない
 */
export function MixFlowSetting() {
  const shown = useSyncExternalStore(subscribeMixFlow, isMouseDevice, () => false);
  const on = useSyncExternalStore(subscribeMixFlow, mixFlowEnabled, () => true);
  const t = useText(TEXT);
  if (!shown) return null;
  return (
    <SettingSection eyebrow="Motion" title={t.title}>
      <CheckRow checked={on} onChange={setMixFlowEnabled}>
        {t.flow}
      </CheckRow>
    </SettingSection>
  );
}
