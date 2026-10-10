/**
 * CSS を使えない所（共有の絵・アプリの設定・ブラウザの上の帯の色）で使う色。値は globals.css の色と同じにし、
 * test/design-rules.test.ts が一致を見る。部品では使わず、Tailwind の色（bg-background など）を使う
 */
export const COLORS = {
  /** アイコンと共有の絵の地の明るい灰色（src/assets/icon-source.png の地） */
  iconBg: '#ecf0f2',
  /** 初音ミクの髪の青緑（--miku・暗い画面の --accent） */
  miku: '#39c5bb',
  /** 明るい画面の差し色（--accent） */
  accentLight: '#0b7770',
  /** 明るい画面と暗い画面の地（--background） */
  lightBg: '#f5f9f9',
  darkBg: '#12181b',
  /** 明るい画面の字と、薄い字（--foreground・--muted） */
  ink: '#10181a',
  muted: '#5d6f73',
} as const;
