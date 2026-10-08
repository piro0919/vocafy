import type { ReactNode } from 'react';

/*
 * 使うアイコンだけを手で持つ。どれも 24×24 で描く。
 * かわいく見えるよう、線の端と角はすべて丸める。塗りの三角も、同じ色の太い線で縁取って角を丸める（ROUND_FILL）。
 * ボカロらしさは、意味が読める範囲で足す（ボカロP はヘッドホン、ホームは屋根の下の音符、歌声は歌うマイク、年代は暦。どれにも同じ八分音符を入れる）
 */
const ROUND_FILL = {
  fill: 'currentColor',
  stroke: 'currentColor',
  strokeWidth: 2.5,
  strokeLinejoin: 'round',
} as const;

const ICONS = {
  play: <path {...ROUND_FILL} d="M8.5 5.5v13l10-6.5z" />,
  pause: (
    <g fill="currentColor">
      <rect x="5.5" y="4.5" width="4.5" height="15" rx="2.25" />
      <rect x="14" y="4.5" width="4.5" height="15" rx="2.25" />
    </g>
  ),
  prev: (
    <>
      <rect x="5" y="5.5" width="3" height="13" rx="1.5" fill="currentColor" />
      <path {...ROUND_FILL} d="M18.5 6.5v11l-8-5.5z" />
    </>
  ),
  next: (
    <>
      <rect x="16" y="5.5" width="3" height="13" rx="1.5" fill="currentColor" />
      <path {...ROUND_FILL} d="M5.5 6.5v11l8-5.5z" />
    </>
  ),
  close: <path d="M6.5 6.5l11 11m0-11-11 11" strokeWidth={2.5} />,
  home: (
    <>
      <path d="M4 11.2 12 4.5l8 6.7V19a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 19z" />
      {/* 戸口のかわりの八分音符 */}
      <circle cx="10.8" cy="16.6" r="1.7" fill="currentColor" stroke="none" />
      <path d="M12.4 16.4v-5l2.6 1" strokeWidth={1.7} />
    </>
  ),
  artist: (
    <>
      {/* ヘッドホンを着けた人 */}
      <circle cx="12" cy="10" r="3.6" fill="currentColor" stroke="none" />
      <path d="M6.2 10.5a5.8 5.8 0 0 1 11.6 0" />
      <rect x="4.6" y="9.2" width="3.2" height="5" rx="1.6" fill="currentColor" stroke="none" />
      <rect x="16.2" y="9.2" width="3.2" height="5" rx="1.6" fill="currentColor" stroke="none" />
      <path d="M5.5 21c.6-2.8 3.2-4.6 6.5-4.6s5.9 1.8 6.5 4.6" fill="currentColor" />
    </>
  ),
  voice: (
    <>
      {/* 歌うマイク。音符はホームと同じ形 */}
      <rect x="6.5" y="3.5" width="6" height="10.5" rx="3" fill="currentColor" stroke="none" />
      <path d="M3.8 11.5a5.7 5.7 0 0 0 11.4 0M9.5 17.2v3.3m-3 0h6" />
      <circle cx="17.6" cy="16.6" r="1.7" fill="currentColor" stroke="none" />
      <path d="M19.2 16.4v-5l2.6 1" strokeWidth={1.7} />
    </>
  ),
  year: (
    <>
      {/* 暦。日付のかわりに、ホームと同じ音符 */}
      <rect x="4" y="5.5" width="16" height="14.5" rx="3" />
      <path d="M8 3.5v4m8-4v4M4 10.5h16" />
      <circle cx="10.8" cy="16.4" r="1.7" fill="currentColor" stroke="none" />
      <path d="M12.4 16.2v-3.6l2.6 1" strokeWidth={1.7} />
    </>
  ),
  search: (
    <>
      <circle cx="10.5" cy="10.5" r="6" />
      <path d="m15 15 4.5 4.5" strokeWidth={2.5} />
    </>
  ),
  expand: <path d="M10 5H5v5m0-5 5.5 5.5M14 19h5v-5m0 5-5.5-5.5" />,
  settings: (
    <>
      <path d="M12 3.5c.9 0 1.5.7 1.6 1.5l.1.9 1 .4.7-.6a1.6 1.6 0 0 1 2.2.1l.6.6c.6.6.6 1.6.1 2.2l-.6.7.4 1 .9.1c.8.1 1.5.7 1.5 1.6v.8c0 .9-.7 1.5-1.5 1.6l-.9.1-.4 1 .6.7c.5.6.5 1.6-.1 2.2l-.6.6c-.6.6-1.6.6-2.2.1l-.7-.6-1 .4-.1.9c-.1.8-.7 1.5-1.6 1.5h-.8c-.9 0-1.5-.7-1.6-1.5l-.1-.9-1-.4-.7.6c-.6.5-1.6.5-2.2-.1l-.6-.6a1.6 1.6 0 0 1-.1-2.2l.6-.7-.4-1-.9-.1c-.8-.1-1.5-.7-1.5-1.6v-.8c0-.9.7-1.5 1.5-1.6l.9-.1.4-1-.6-.7a1.6 1.6 0 0 1 .1-2.2l.6-.6c.6-.6 1.6-.6 2.2-.1l.7.6 1-.4.1-.9c.1-.8.7-1.5 1.6-1.5z" />
      <circle cx="12" cy="12" r="2.8" />
    </>
  ),
  volume: (
    <>
      <path {...ROUND_FILL} strokeWidth={2} d="M4 10v4h3.5l4.5 4V6L7.5 10z" />
      <path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11" />
    </>
  ),
  volumeLow: (
    <>
      <path {...ROUND_FILL} strokeWidth={2} d="M6 10v4h3.5l4.5 4V6L9.5 10z" />
      <path d="M17.5 9a4 4 0 0 1 0 6" />
    </>
  ),
  volumeOff: (
    <>
      <path {...ROUND_FILL} strokeWidth={2} d="M4 10v4h3.5l4.5 4V6L7.5 10z" />
      <path d="m15.5 9.5 5 5m0-5-5 5" />
    </>
  ),
  shuffle: (
    <path d="M4 7h2.5c2 0 3.2.9 4.3 2.6l2.4 4.8c1.1 1.7 2.3 2.6 4.3 2.6H20M4 17h2.5c1.4 0 2.4-.4 3.3-1.3M13.7 8.3C14.6 7.4 15.6 7 17 7h3m-2.5-2.5L20 7l-2.5 2.5m0 5L20 17l-2.5 2.5" />
  ),
  repeat: (
    <path d="M4.5 12V10a3 3 0 0 1 3-3H19m-2.5-2.5L19 7l-2.5 2.5M19.5 12v2a3 3 0 0 1-3 3H5m2.5 2.5L5 17l2.5-2.5" />
  ),
  repeatOne: (
    <>
      <path d="M4.5 12V10a3 3 0 0 1 3-3H19m-2.5-2.5L19 7l-2.5 2.5M19.5 12v2a3 3 0 0 1-3 3H5m2.5 2.5L5 17l2.5-2.5" />
      <path d="M11.2 10.8 12.4 10v4" strokeWidth={1.6} />
    </>
  ),
  install: <path d="M12 4v10m-4-4 4 4 4-4M5 19.5h14" />,
  left: <path d="M14.5 6.5 9 12l5.5 5.5" strokeWidth={2.5} />,
  right: <path d="M9.5 6.5 15 12l-5.5 5.5" strokeWidth={2.5} />,
} satisfies Record<string, ReactNode>;

export type IconName = keyof typeof ICONS;

export function Icon({ name, className = 'size-6' }: { name: IconName; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      {ICONS[name]}
    </svg>
  );
}
