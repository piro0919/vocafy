import { Heading, SECTION } from '../heading';

/** キー操作の一覧（player-keys.tsx と同じ割り当て）。設定の画面と、? で開く板の両方に出す */
const KEYS: [string, string][] = [
  ['Space / K', '再生・一時停止'],
  ['← / →', '5秒戻る・進む'],
  ['J / L', '10秒戻る・進む'],
  ['0〜9', '曲の0〜90%の位置へ'],
  ['Shift + ← / →', '前の曲・次の曲'],
  ['Shift + P / N', '前の曲・次の曲'],
  ['↑ / ↓', '音量を上げる・下げる'],
  ['M', '消音'],
  ['S', 'ランダム再生'],
  ['R', 'ループ'],
  ['H', 'お気に入りに入れる・外す'],
  ['Q', '次に流れる曲'],
  ['A', 'ラジオ'],
  ['/', '検索'],
  ['?', 'キーボード操作の一覧'],
];

export function KeyList() {
  return (
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
  );
}

/** 設定の画面に載せる一覧。キーボードのないスマホでは出さない */
export function KeyboardHelp() {
  return (
    <section className={`hidden md:block ${SECTION}`}>
      <div className="mb-3">
        <Heading eyebrow="Keyboard">キーボード操作</Heading>
      </div>
      <KeyList />
    </section>
  );
}
