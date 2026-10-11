'use client';

import { useLang } from '@/i18n/navigation';

/** 比べるための形。小文字にし、語の末尾の s を外す（Favorites と Favorite songs を同じ言葉とみなす） */
const stem = (text: string) =>
  text
    .toLowerCase()
    .split(/\s+/)
    .map((word) => word.replace(/s$/, ''))
    .join(' ');

/**
 * 見出しの上の小さな英字。英語の画面では、題名がその英字の言葉を含むとき（「SETTINGS / Settings」「KEYBOARD / Keyboard shortcuts」）
 * 出さない。英字は日本語の題名に添える飾りで、英語の題名の上では同じ言葉の繰り返しになるため（2026-10-12 に本人と決めた）。
 * 日本語の画面ではいつも出す
 */
export function Eyebrow({ text, title }: { text: string; title?: string }) {
  const lang = useLang();
  if (lang === 'en' && title !== undefined && stem(title).includes(stem(text))) return null;
  return (
    <p
      aria-hidden
      className="mb-1 font-tech text-eyebrow font-black tracking-eyebrow text-accent uppercase"
    >
      {text}
    </p>
  );
}
