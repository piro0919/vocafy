import type { ReactNode } from 'react';
import { Heading } from './heading';

/** 規約やポリシーの本文。読みやすい幅に絞り、見出しと段落の間を空ける。題名はほかの画面と同じ見出しの部品で、左に寄せる */
export function Legal({
  title,
  eyebrow,
  updated,
  children,
}: {
  title: string;
  /** 題名の上の小さな英字 */
  eyebrow: string;
  updated: string;
  children: ReactNode;
}) {
  return (
    <article className="max-w-2xl pt-4 leading-relaxed [&_a]:text-accent [&_a]:underline [&_h2]:mt-10 [&_h2]:mb-3 [&_h2]:text-lg [&_h2]:font-bold [&_li]:mt-1 [&>p]:mt-3 [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:pl-6">
      {/* 段落の上の余白は本文の直下の段落にだけ付ける（[&>p]）。題名の上の英字も段落なので、子孫まで付けると題名がほかの画面より下にずれた */}
      <Heading as="h1" size="page" eyebrow={eyebrow}>
        {title}
      </Heading>
      <p className="text-sm text-muted">最終更新日: {updated}</p>
      {children}
    </article>
  );
}
