import { Heading, SECTION } from '../heading';

/** 設定の画面に載せる、プレイヤーのキー操作の一覧（player-keys.tsx と同じ割り当て）。キーボードのないスマホでは出さない */
const KEYS: [string, string][] = [
  ['Space', '再生・一時停止'],
  ['← / →', '5秒戻る・進む'],
  ['Shift + ← / →', '前の曲・次の曲'],
  ['↑ / ↓', '音量を上げる・下げる'],
  ['M', '消音'],
  ['S', 'ランダム再生'],
  ['R', 'ループ'],
];

export function KeyboardHelp() {
  return (
    <section className={`hidden md:block ${SECTION}`}>
      <div className="mb-3">
        <Heading eyebrow="Keyboard">キーボード操作</Heading>
      </div>
      <dl className="grid grid-cols-keys gap-x-6 gap-y-2 px-3 text-sm">
        {KEYS.map(([key, label]) => (
          <div key={key} className="contents">
            <dt>
              <kbd className="rounded border border-line/60 bg-surface px-1.5 py-0.5 font-sans text-xs">
                {key}
              </kbd>
            </dt>
            <dd className="text-muted">{label}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
