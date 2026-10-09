import type { ReactNode } from 'react';

/**
 * 見出し。上に字間を広げた小さな英字（eyebrow）を、ロゴと同じ機械的な字（Orbitron）で差し色で添え、
 * 本体は丸みのある太字にする。英字は飾りで、意味は日本語の側に持たせる（英字は読み上げない）。
 * 英字は一覧や区画の画面に付け、ボカロPや歌声の詳細の画面には付けない（顔の画像と名前で何の画面か分かり、
 * 英字の分だけ名前の横のハートが上にずれたため）
 */
export function Heading({
  eyebrow,
  as: Tag = 'h2',
  size = 'section',
  className = '',
  children,
}: {
  eyebrow?: string;
  as?: 'h1' | 'h2';
  /** page は画面の題名、section は棚や欄の見出し */
  size?: 'page' | 'section';
  /** 大きさを画面ごとに変えるときに足す指定 */
  className?: string;
  children: ReactNode;
}) {
  return (
    <div>
      {eyebrow && (
        <p
          aria-hidden
          className="mb-1 font-tech text-[0.65rem] font-black tracking-[0.3em] text-accent uppercase"
        >
          {eyebrow}
        </p>
      )}
      <Tag
        className={`font-display leading-tight ${
          size === 'page' ? 'text-3xl sm:text-4xl' : 'text-xl sm:text-2xl'
        } ${className}`}
      >
        {children}
      </Tag>
    </div>
  );
}
