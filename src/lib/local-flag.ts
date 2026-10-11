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

  const subscribe = subscribeTo(event);

  return { read, write, subscribe };
}

/**
 * このブラウザに残す選択（テーマ・サイトカラー）。既定（fallback）を選んだときは何も残さない。残っている値が values に無ければ既定。
 * save は残すだけで、合図は送らない（画面に当て終えてから notify で知らせる。サイトカラーはフェードのあとに当たる）
 */
export function createLocalChoice<T extends string>({
  key,
  values,
  fallback,
  event,
}: {
  key: string;
  values: readonly T[];
  fallback: T;
  event: string;
}) {
  function read(): T {
    try {
      const v = localStorage.getItem(key);
      return values.find((value) => value === v) ?? fallback;
    } catch {
      return fallback;
    }
  }

  function save(value: T) {
    try {
      if (value === fallback) localStorage.removeItem(key);
      else localStorage.setItem(key, value);
    } catch {
      // 残せない窓では、開き直すと既定に戻る
    }
  }

  const notify = () => window.dispatchEvent(new Event(event));

  const subscribe = subscribeTo(event);

  return { read, save, notify, subscribe };
}

/** その合図と、ほかのタブで localStorage が変わったときの知らせ（storage）を受ける（useSyncExternalStore 用） */
function subscribeTo(event: string) {
  return (onChange: () => void): (() => void) => {
    window.addEventListener(event, onChange);
    window.addEventListener('storage', onChange);
    return () => {
      window.removeEventListener(event, onChange);
      window.removeEventListener('storage', onChange);
    };
  };
}
