'use client';

import { useRouter as useProgressRouter } from '@bprogress/next/app';
import NextLink from 'next/link';
import { usePathname as useNextPathname } from 'next/navigation';
import { type ComponentProps, useMemo } from 'react';
import { langOfPath, localize, stripLang, type Lang } from './config';
import { startNavigation } from '@/lib/pending-navigation';

/**
 * 画面の移動は、頭に言語の付かない住所（`/producers/45`）で書き、ここでいまの言語の住所にする。
 * コードの中の住所（並びの持ち主の画面など）は言語を持たないので、英語の画面でも同じ値で比べられる
 */

/** いまの画面の言語。住所の頭から読む（サーバーが中で描く `/ja/...` も、ブラウザの `/...` も日本語になる） */
export function useLang(): Lang {
  return langOfPath(useNextPathname());
}

/** いまの住所から言語を外したもの（`/en/producers/45` → `/producers/45`） */
export function usePathname(): string {
  return stripLang(useNextPathname());
}

/** 住所をいまの言語の住所にする関数 */
export function useLocalize(): (path: string) => string {
  const lang = useLang();
  return useMemo(() => (path: string) => localize(path, lang), [lang]);
}

/** next/link の代わり。href を、いまの言語の住所にする */
export function Link({ href, ...props }: ComponentProps<typeof NextLink>) {
  const to = useLocalize();
  return <NextLink href={typeof href === 'string' ? to(href) : href} {...props} />;
}

/** 先頭の引数（住所）を除いた引数 */
type Rest<F> = F extends (href: string, ...rest: infer R) => unknown ? R : never;

/**
 * @bprogress/next/app の useRouter の代わり。push・replace・prefetch の住所を、いまの言語の住所にする。
 * push・replace は、住所が変わるまで移動中の印を付ける（pending-navigation.ts）
 */
export function useRouter() {
  const router = useProgressRouter();
  const to = useLocalize();
  return useMemo(
    () => ({
      ...router,
      push: (href: string, ...rest: Rest<typeof router.push>) => {
        startNavigation();
        router.push(to(href), ...rest);
      },
      replace: (href: string, ...rest: Rest<typeof router.replace>) => {
        startNavigation();
        router.replace(to(href), ...rest);
      },
      prefetch: (href: string, ...rest: Rest<typeof router.prefetch>) =>
        router.prefetch(to(href), ...rest),
    }),
    [router, to],
  );
}

/** 部品の文言（text.ts の defineText で作った組）から、いまの言語の分を引く */
export function useText<T>(text: Record<Lang, T>): T {
  return text[useLang()];
}
