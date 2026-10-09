import Link from 'next/link';
import { PAGE_SIZE } from '@/lib/catalog';
import { Icon } from './icon';

/**
 * 住所の末尾のページ番号。/kana/abc は 1 ページ目、/kana/abc/2 は 2 ページ目。
 * 1 ページ目を /kana/abc/1 と書いたものや、数字でないものは null（無いページとして扱う）
 */
export function pageOf(segments: string[] | undefined): number | null {
  if (!segments || segments.length === 0) return 1;
  if (segments.length > 1 || !/^[1-9]\d*$/.test(segments[0])) return null;
  const page = Number(segments[0]);
  return page >= 2 ? page : null;
}

/** そのページの住所。1 ページ目は番号を付けない */
const hrefOf = (base: string, page: number) => (page === 1 ? base : `${base}/${page}`);

/**
 * 一覧の下に置くページ送り。全体が1ページに収まるときは何も出さない。
 * size は1ページの件数（曲の一覧は PAGE_SIZE）。href は住所の作り方で、既定は base の末尾に番号を足す形
 */
export function Pager({
  base,
  page,
  total,
  size = PAGE_SIZE,
  href = (p) => hrefOf(base, p),
}: {
  base: string;
  page: number;
  total: number;
  size?: number;
  href?: (page: number) => string;
}) {
  const last = Math.ceil(total / size);
  if (last <= 1) return null;
  const pages = Array.from({ length: last }, (_, i) => i + 1);
  const arrow =
    'grid size-9 place-items-center rounded-full border border-accent/40 text-accent transition-[background-color,scale] duration-150 ease-out hover:bg-accent/10 active:scale-95';
  return (
    <nav aria-label="ページ" className="mt-8 flex flex-wrap items-center justify-center gap-2">
      {page > 1 && (
        <Link href={href(page - 1)} aria-label="前のページ" className={arrow}>
          <Icon name="left" className="size-5" />
        </Link>
      )}
      {pages.map((p) => (
        <Link
          key={p}
          href={href(p)}
          aria-current={p === page ? 'page' : undefined}
          className={`grid h-9 min-w-9 place-items-center rounded-full px-2 font-tech text-sm font-black transition-[background-color,scale] duration-150 ease-out active:scale-95 ${
            p === page ? 'bg-miku text-on-miku' : 'text-accent hover:bg-accent/10'
          }`}
        >
          {p}
        </Link>
      ))}
      {page < last && (
        <Link href={href(page + 1)} aria-label="次のページ" className={arrow}>
          <Icon name="right" className="size-5" />
        </Link>
      )}
    </nav>
  );
}
