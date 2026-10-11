'use client';

import { Link, useText } from '@/i18n/navigation';
import { NOT_FOUND_TEXT as TEXT } from './not-found-text';
import { Heading } from '@/components/heading';
import { PRIMARY } from '@/components/button-styles';
import { Icon } from '@/components/icon';

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
