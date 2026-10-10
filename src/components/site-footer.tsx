'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CONTACT_FORM_URL, OPERATOR } from '@/lib/site';

/**
 * 本文の下の段。規約などのリンクはトップにだけ出す（全ページに出すとうっとうしいと言われた。2026-10-09）。
 * 段そのものは、下に出したままの帯やプレイヤーが本文の最後を隠さないための余白（page-bottom）を持つので、どの画面にも置く
 */
export function SiteFooter() {
  const pathname = usePathname();
  if (pathname !== '/') return <div className="page-bottom" />;

  return (
    // 375px の幅でも、リンク3つと © が1行に収まるよう、スマホでは字を小さく、間を詰める
    <footer className="page-bottom page-x flex items-center gap-x-3 pt-6 text-footer whitespace-nowrap text-muted sm:gap-x-6 sm:text-sm">
      <Link href="/terms" className="hover:text-foreground">
        利用規約
      </Link>
      <Link href="/privacy" className="hover:text-foreground">
        プライバシーポリシー
      </Link>
      <a
        href={CONTACT_FORM_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="hover:text-foreground"
      >
        お問い合わせ
      </a>
      <span className="ml-auto">© {OPERATOR}</span>
    </footer>
  );
}
