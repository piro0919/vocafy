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
  id,
  children,
}: {
  eyebrow?: string;
  as?: 'h1' | 'h2';
  /** page は画面の題名、section は棚や欄の見出し */
  size?: 'page' | 'section';
  /** 大きさを画面ごとに変えるときに足す指定 */
  className?: string;
  /** aria-labelledby で区画やラジオの組の名前にするときの id */
  id?: string;
  children: ReactNode;
}) {
  return (
    <div>
      {eyebrow && (
        <p
          aria-hidden
          className="mb-1 font-tech text-eyebrow font-black tracking-eyebrow text-accent uppercase"
        >
          {eyebrow}
        </p>
      )}
      <Tag
        id={id}
        className={`font-display leading-tight ${
          size === 'page' ? 'text-3xl sm:text-4xl' : 'text-xl sm:text-2xl'
        } ${className}`}
      >
        {children}
      </Tag>
    </div>
  );
}

/**
 * 区画どうしの間隔（上の余白）。どの画面の区画もこれを使う。見出しから中身までは mb-3（12px）
 * （2026-10-09 にそろえた。前はトップの中でも 40px と 56px、検索は 32px、設定は 40px だった）
 */
export const SECTION = 'mt-10 sm:mt-14';

/** 一覧の中の年ごとの区切りの見出し（日付の画面・歌声の画面の年） */
export const YEAR_HEADING = 'font-tech text-sm font-black tracking-label text-accent';
