'use client';

import { Heading, SECTION } from '../heading';
import { defineText } from '@/i18n/text';
import { useText } from '@/i18n/navigation';

/** キー操作の一覧（player-keys.tsx と同じ割り当て）。設定の画面と、? で開く板の両方に出す */
const KEYS = [
  ['Space / K', 'playPause'],
  ['← / →', 'seek5'],
  ['J / L', 'seek10'],
  ['0〜9', 'seekPercent'],
  ['Shift + ← / →', 'prevNext'],
  ['Shift + P / N', 'prevNext'],
  ['↑ / ↓', 'volume'],
  ['M', 'mute'],
  ['S', 'shuffle'],
  ['R', 'repeat'],
  ['H', 'favorite'],
  ['Q', 'upNext'],
  ['A', 'radio'],
  ['/', 'search'],
  ['?', 'help'],
] as const;

const TEXT = defineText({
  ja: {
    title: 'キーボード操作',
    playPause: '再生・一時停止',
    seek5: '5秒戻る・進む',
    seek10: '10秒戻る・進む',
    seekPercent: '曲の0〜90%の位置へ',
    prevNext: '前の曲・次の曲',
    volume: '音量を上げる・下げる',
    mute: '消音',
    shuffle: 'ランダム再生',
    repeat: 'ループ',
    favorite: 'お気に入りに入れる・外す',
    upNext: '次に流れる曲',
    radio: 'ラジオ',
    search: '検索',
    help: 'キーボード操作の一覧',
  },
  en: {
    title: 'Keyboard shortcuts',
    playPause: 'Play / pause',
    seek5: 'Back / forward 5 seconds',
    seek10: 'Back / forward 10 seconds',
    seekPercent: 'Jump to 0–90% of the song',
    prevNext: 'Previous / next song',
    volume: 'Volume up / down',
    mute: 'Mute',
    shuffle: 'Shuffle',
    repeat: 'Repeat',
    favorite: 'Add to / remove from favorites',
    upNext: 'Up next',
    radio: 'Radio',
    search: 'Search',
    help: 'Show keyboard shortcuts',
  },
});

/** 「キーボード操作」の見出し。? で開く板（player-keys.tsx）の題名にも使う */
export function useKeyboardTitle(): string {
  return useText(TEXT).title;
}

export function KeyList() {
  const t = useText(TEXT);
  return (
    <dl className="grid grid-cols-keys gap-x-6 gap-y-2 px-3 text-sm">
      {KEYS.map(([key, label]) => (
        <div key={key} className="contents">
          <dt>
            <kbd className="rounded border border-line/60 bg-surface px-1.5 py-0.5 font-sans text-xs">
              {key}
            </kbd>
          </dt>
          <dd className="text-muted">{t[label]}</dd>
        </div>
      ))}
    </dl>
  );
}

/** 設定の画面に載せる一覧。キーボードのないスマホでは出さない */
export function KeyboardHelp() {
  const t = useText(TEXT);
  return (
    <section className={`hidden md:block ${SECTION}`}>
      <div className="mb-3">
        <Heading eyebrow="Keyboard">{t.title}</Heading>
      </div>
      <KeyList />
    </section>
  );
}
