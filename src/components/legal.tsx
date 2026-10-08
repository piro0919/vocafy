import type { ReactNode } from 'react';

/** 規約やポリシーの本文。読みやすい幅に絞り、見出しと段落の間を空ける */
export function Legal({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: ReactNode;
}) {
  return (
    <article className="mx-auto max-w-2xl pt-4 leading-relaxed [&_a]:text-accent [&_a]:underline [&_h2]:mt-10 [&_h2]:mb-3 [&_h2]:text-lg [&_h2]:font-bold [&_li]:mt-1 [&_p]:mt-3 [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:pl-6">
      <h1 className="text-3xl font-bold">{title}</h1>
      <p className="text-sm text-muted">最終更新日: {updated}</p>
      {children}
    </article>
  );
}
