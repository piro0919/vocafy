import type { ReactNode } from 'react';
import type { Lang } from '@/i18n/config';
import { defineText } from '@/i18n/text';
import { Heading } from './heading';

const TEXT = defineText({
  ja: {
    updated: (date: string) => `最終更新日: ${date}`,
    // 日本語の版が正本なので、日本語の画面には断り書きを出さない
    precedence: '',
  },
  en: {
    updated: (date: string) => `Last updated: ${date}`,
    precedence:
      'This is an English translation provided for convenience. The Japanese version is the official version, and if the two differ, the Japanese version prevails.',
  },
});

/** 規約やポリシーの本文。読みやすい幅に絞り、見出しと段落の間を空ける。題名はほかの画面と同じ見出しの部品で、左に寄せる */
export function Legal({
  lang,
  title,
  eyebrow,
  updated,
  children,
}: {
  lang: Lang;
  title: string;
  /** 題名の上の小さな英字 */
  eyebrow: string;
  updated: string;
  children: ReactNode;
}) {
  const t = TEXT[lang];
  return (
    <article className="max-w-2xl pt-4 leading-relaxed [&_a]:text-accent [&_a]:underline [&_h2]:mt-10 [&_h2]:mb-3 [&_h2]:text-lg [&_h2]:font-bold [&_li]:mt-1 [&>p]:mt-3 [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:pl-6">
      {/* 段落の上の余白は本文の直下の段落にだけ付ける（[&>p]）。題名の上の英字も段落なので、子孫まで付けると題名がほかの画面より下にずれた */}
      <Heading as="h1" size="page" eyebrow={eyebrow}>
        {title}
      </Heading>
      <p className="text-sm text-muted">{t.updated(updated)}</p>
      {/* 英訳の頭に、日本語の版が優先することを断る（2026-10-12 に本人と決めた） */}
      {t.precedence && <p>{t.precedence}</p>}
      {children}
    </article>
  );
}
