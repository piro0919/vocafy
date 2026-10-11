import { isAppleDevice } from './apple-device';
import { atLeast } from './breakpoints';
import { createLocalFlag } from './local-flag';

/**
 * トップのきょうの出会いの壁を流すか（home-sections.tsx の FlowingWall）。流せるのはマウスの端末だけで、
 * 設定の画面の「トップの動き」で止められる（mix-flow-setting.tsx）。はじめは流す。止めたときだけ localStorage に残す
 */
const flag = createLocalFlag({
  key: 'vocafy-mix-flow-off',
  value: '1',
  stored: false,
  event: 'vocafy-mix-flow',
});

/** マウスで指せる端末か。iPad はトラックパッドでもマウスの端末に見えるので外す */
const MOUSE_QUERY = '(hover: hover) and (pointer: fine)';
export const isMouseDevice = () => window.matchMedia(MOUSE_QUERY).matches && !isAppleDevice();

/** 壁を流す画面か。パソコンの幅で、動きを減らす設定でない */
const FLOW_QUERY = `${atLeast('lg')} and (prefers-reduced-motion: no-preference)`;

export const mixFlowEnabled = flag.read;
export const setMixFlowEnabled = flag.write;

/** いま壁を流すか。端末・画面の幅・動きを減らす設定・設定の画面の切り替えをまとめて見る */
export const canFlow = () =>
  isMouseDevice() && window.matchMedia(FLOW_QUERY).matches && mixFlowEnabled();

export function subscribeMixFlow(onChange: () => void): () => void {
  const queries = [window.matchMedia(MOUSE_QUERY), window.matchMedia(FLOW_QUERY)];
  for (const query of queries) query.addEventListener('change', onChange);
  const unsubscribe = flag.subscribe(onChange);
  return () => {
    for (const query of queries) query.removeEventListener('change', onChange);
    unsubscribe();
  };
}
