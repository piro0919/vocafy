import type { ReactNode } from 'react';

/**
 * 見出し。上に字間を広げた小さな英字（eyebrow）を、ロゴと同じ機械的な字（Orbitron）で差し色で添え、
 * 本体は丸みのある太字にする。英字は飾りで、意味は日本語の側に持たせる（英字は読み上げない）
 */
export function Heading({
  eyebrow,
  as: Tag = 'h2',
  size = 'section',
  children,
}: {
  eyebrow?: string;
  as?: 'h1' | 'h2';
  /** page は画面の題名、section は棚や欄の見出し */
  size?: 'page' | 'section';
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
        }`}
      >
        {children}
      </Tag>
    </div>
  );
}
