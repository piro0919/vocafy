import type { ProducerLinks as Links } from '@/lib/catalog';
import { Icon } from './icon';

/** 並べる順と、読み上げの名前。本人の場所が1つも無い人には何も出さない */
const SERVICES = [
  { key: 'x', label: 'X' },
  { key: 'youtube', label: 'YouTube' },
  { key: 'niconico', label: 'ニコニコ' },
  { key: 'website', label: '公式サイト' },
] as const;

/** ボカロPの画面の、名前の下に並べる本人の場所（X・YouTube・ニコニコ・公式サイト） */
export function ProducerLinks({ name, links }: { name: string; links: Links }) {
  const shown = SERVICES.flatMap((s) => (links[s.key] ? [{ ...s, href: links[s.key]! }] : []));
  if (shown.length === 0) return null;
  return (
    <ul className="-ml-2 flex items-center">
      {shown.map((s) => (
        <li key={s.key}>
          <a
            href={s.href}
            target="_blank"
            rel="noopener"
            aria-label={`${name}の${s.label}`}
            title={s.label}
            className="grid size-9 place-items-center rounded-full text-muted transition-[color,scale] duration-150 ease-out hover:bg-foreground/8 hover:text-foreground active:scale-90"
          >
            <Icon name={s.key} className="size-5" />
          </a>
        </li>
      ))}
    </ul>
  );
}
