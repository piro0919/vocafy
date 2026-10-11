/**
 * このブラウザに残す入・切の設定（トップの動き・スワイプで戻る・Visualizer の連携・前回の続きから始める）。
 * 既定と違う側に切り替えたときだけ、key に value を残す（既定のままの人は何も残さない）。
 * 開けない・書けない窓（プライベートブラウズなど）では既定のまま読み、書けなければこの画面のあいだも切り替わらない。
 * 切り替えは同じタブには独自の合図で、ほかのタブには storage の合図で知らせる（useSyncExternalStore の subscribe）
 */
export function createLocalFlag({
  key,
  value,
  stored,
  event = `${key}-change`,
}: {
  /** localStorage の鍵 */
  key: string;
  /** 残す値（'on' や '1'） */
  value: string;
  /** 値が残っているときの入・切。既定はその反対 */
  stored: boolean;
  /** 同じタブに知らせる合図の名前 */
  event?: string;
}) {
  function read(): boolean {
    try {
      return localStorage.getItem(key) === value ? stored : !stored;
    } catch {
      return !stored;
    }
  }

  function write(on: boolean) {
    try {
      if (on === stored) localStorage.setItem(key, value);
      else localStorage.removeItem(key);
    } catch {
      // 残せない窓。切り替わらない
    }
    window.dispatchEvent(new Event(event));
  }

  function subscribe(onChange: () => void): () => void {
    window.addEventListener(event, onChange);
    window.addEventListener('storage', onChange);
    return () => {
      window.removeEventListener(event, onChange);
      window.removeEventListener('storage', onChange);
    };
  }

  return { read, write, subscribe };
}
