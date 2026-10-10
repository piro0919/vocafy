/**
 * 画面の上部の背景（ambient.tsx）が、流している曲のサムネから取って敷いている2色。曲を流していないときは null。
 * Vocafy Visualizer に同じ色を送るため、背景の部品の外から読めるようにする（visualizer-link.tsx）。
 * 値は CSS の色の文字列（hsl() や color-mix() のまま）
 */
let colors: string | null = null;
const listeners = new Set<() => void>();

/** 2色を「|」でつないだもの。useSyncExternalStore で、色が同じなら同じ値を返すため */
export function readAmbientColors(): string | null {
  return colors;
}

export function publishAmbientColors(next: [string, string] | null) {
  const joined = next ? next.join('|') : null;
  if (joined === colors) return;
  colors = joined;
  for (const listener of listeners) listener();
}

export function subscribeAmbientColors(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
