'use client';

import { useRef } from 'react';
import { Link, usePathname, useText } from '@/i18n/navigation';
import { defineText } from '@/i18n/text';
import { useFavoriteProducers } from '@/lib/favorites';
import { IMAGE_SIZES } from '@/lib/image-sizes';
import { useProducerName } from './display-names';
import { FadeImage } from './fade-image';
import { edgeMask, useScrollEdges } from './scroll-row';
import { sidebarSubRow } from './surface-styles';

const TEXT = defineText({
  ja: { title: 'お気に入りのボカロP' },
  en: { title: 'Favorite producers' },
});

/**
 * 左のメニューの「お気に入り」のすぐ下（履歴の上）に並べる、お気に入りのボカロP（2026-10-12 に本人と決めた。YouTube の登録チャンネルと同じ形）。
 * 見出しは付けず、お気に入りの行に続けて並べる。ほかの項目と同じ階層に見えないよう、縦の線を引いて字下げし、画像と字を一段小さく軽くする。足した順の新しい人が先。人数で切らず、メニューの空いた高さに収まらない分は、この区画の中だけをスクロールさせる。
 * スクロールバーは見せず、続きのある側の端だけをぼかす。新曲の印は付けない（人数分の問い合わせが画面を開くたびに走るため）
 */
export function SidebarProducers() {
  const { items: producers } = useFavoriteProducers();
  const pathname = usePathname();
  const producerName = useProducerName();
  const t = useText(TEXT);
  const list = useRef<HTMLUListElement>(null);
  // 測る前はぼかさない。一覧は読み込んでから現れるので、人数が変わったら測り直す
  const edge = useScrollEdges(list, { start: true, end: true }, producers.length, 'y');

  if (producers.length === 0) return null;

  return (
    // 縦の線は「お気に入り」のアイコンの真下（行の左の余白 12px ＋ アイコンの半分 12px）から引き、行はその右へ下げて子に見せる
    <section
      aria-label={t.title}
      className="ml-6 flex min-h-0 flex-col border-l border-line/60 pl-4"
    >
      <ul
        ref={list}
        className="flex min-h-0 flex-col gap-0.5 overflow-y-auto no-scrollbar"
        style={{ maskImage: edgeMask(edge, 'y') }}
      >
        {producers.map((p) => {
          const href = `/producers/${p.id}`;
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <li key={p.id}>
              <Link href={href} className={sidebarSubRow(active)}>
                {p.picture ? (
                  <FadeImage
                    src={p.picture}
                    alt=""
                    width={IMAGE_SIZES.avatar}
                    height={IMAGE_SIZES.avatar}
                    className="size-5 shrink-0 rounded-full bg-surface object-cover"
                  />
                ) : (
                  <span className="size-5 shrink-0 rounded-full bg-surface" />
                )}
                <span className="min-w-0 truncate">{producerName(p.id, p.name)}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
