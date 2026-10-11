'use client';

import type { ProducerLinks as Links } from '@/lib/catalog';
import { defineText } from '@/i18n/text';
import { useText } from '@/i18n/navigation';
import { Icon } from './icon';
import { ICON_SM } from './button-styles';

/** 並べる順と、読み上げの名前。本人の場所が1つも無い人には何も出さない */
const SERVICES = ['x', 'youtube', 'niconico', 'website'] as const;

const TEXT = defineText({
  ja: {
    x: 'X',
    youtube: 'YouTube',
    niconico: 'ニコニコ',
    website: '公式サイト',
    on: (name: string, service: string) => `${name}の${service}`,
  },
  en: {
    x: 'X',
    youtube: 'YouTube',
    niconico: 'Niconico',
    website: 'Website',
    on: (name: string, service: string) =>
      service === 'Website' ? `${name}'s website` : `${name} on ${service}`,
  },
});

/** ボカロPの画面の、名前の下に並べる本人の場所（X・YouTube・ニコニコ・公式サイト） */
export function ProducerLinks({ name, links }: { name: string; links: Links }) {
  const t = useText(TEXT);
  const shown = SERVICES.flatMap((key) =>
    links[key] ? [{ key, label: t[key], href: links[key] }] : [],
  );
  if (shown.length === 0) return null;
  return (
    <ul className="-ml-2 flex items-center">
      {shown.map((s) => (
        <li key={s.key}>
          <a
            href={s.href}
            target="_blank"
            rel="noopener"
            aria-label={t.on(name, s.label)}
            title={s.label}
            className={`grid ${ICON_SM} text-muted hover:text-foreground`}
          >
            <Icon name={s.key} className="size-5" />
          </a>
        </li>
      ))}
    </ul>
  );
}
