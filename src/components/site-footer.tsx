'use client';

import { Link } from '@/i18n/navigation';
import { usePathname, useText } from '@/i18n/navigation';
import { defineText } from '@/i18n/text';
import { TERMS } from '@/i18n/terms';
import { CONTACT_FORM_URL, OPERATOR } from '@/lib/site';
import { isHomePath } from '@/lib/home-path';

const TEXT = defineText({ ja: { contact: 'お問い合わせ' }, en: { contact: 'Contact' } });

/**
 * 本文の下の段。規約などのリンクはトップにだけ出す（全ページに出すとうっとうしいと言われた。2026-10-09）。
 * 段そのものは、下に出したままの帯やプレイヤーが本文の最後を隠さないための余白（page-bottom）を持つので、どの画面にも置く
 */
export function SiteFooter() {
  const pathname = usePathname();
  const t = useText(TEXT);
  const term = useText(TERMS);
  if (!isHomePath(pathname)) return <div className="page-bottom" />;

  return (
    // 375px の幅でも、リンク3つと © が1行に収まるよう、スマホでは字を小さく、間を詰める
    <footer className="page-bottom page-x flex items-center gap-x-3 pt-6 text-footer whitespace-nowrap text-muted sm:gap-x-6 sm:text-sm">
      <Link href="/terms" className="hover:text-foreground">
        {term.terms}
      </Link>
      <Link href="/privacy" className="hover:text-foreground">
        {term.privacy}
      </Link>
      <a
        href={CONTACT_FORM_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="hover:text-foreground"
      >
        {t.contact}
      </a>
      <span className="ml-auto">© {OPERATOR}</span>
    </footer>
  );
}
