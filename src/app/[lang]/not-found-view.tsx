'use client';

import { Link, useText } from '@/i18n/navigation';
import { defineText } from '@/i18n/text';
import { Heading } from '@/components/heading';
import { PRIMARY } from '@/components/button-styles';
import { Icon } from '@/components/icon';

const TEXT = defineText({
  ja: {
    title: 'ページが見つかりません',
    body: 'お探しのページは存在しないか、掲載をやめた可能性があります。',
    home: 'ホームへ',
  },
  en: {
    title: 'Page not found',
    body: 'This page doesn’t exist or is no longer available.',
    home: 'Go home',
  },
});

/**
 * 「見つかりません」の中身。not-found.tsx は params を受け取れないので、言語は住所から読む（ブラウザの部品の useLang）
 */
export function NotFoundView() {
  const t = useText(TEXT);
  return (
    <div className="flex flex-col items-start gap-4 pt-4">
      <Heading as="h1" size="page" eyebrow="Not Found">
        {t.title}
      </Heading>
      <p className="text-muted">{t.body}</p>
      <Link href="/" className={PRIMARY}>
        <Icon name="home" className="size-5" />
        {t.home}
      </Link>
    </div>
  );
}
