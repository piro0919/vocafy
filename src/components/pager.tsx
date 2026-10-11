import { Link } from '@/i18n/navigation';
import { PAGE_SIZE } from '@/lib/page-size';
import { Icon } from './icon';
import { ARROW } from './button-styles';
import { DEFAULT_LANG, type Lang } from '@/i18n/config';
import { defineText } from '@/i18n/text';

const TEXT = defineText({
  ja: { pages: 'ページ', previous: '前のページ', next: '次のページ' },
  en: { pages: 'Pages', previous: 'Previous page', next: 'Next page' },
});

/**
 * 住所の末尾のページ番号。/years/2010 は 1 ページ目、/years/2010/2 は 2 ページ目。
 * 1 ページ目を /years/2010/1 と書いたものや、数字でないものは null（無いページとして扱う）
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
  lang = DEFAULT_LANG,
}: {
  base: string;
  page: number;
  total: number;
  size?: number;
  href?: (page: number) => string;
  /** 画面の言語（ページの params の lang） */
  lang?: Lang;
}) {
  const t = TEXT[lang];
  const last = Math.ceil(total / size);
  if (last <= 1) return null;
  const pages = Array.from({ length: last }, (_, i) => i + 1);
  const arrow = `grid ${ARROW}`;
  return (
    <nav aria-label={t.pages} className="mt-8 flex flex-wrap items-center justify-center gap-2">
      {page > 1 && (
        <Link href={href(page - 1)} aria-label={t.previous} className={arrow}>
          <Icon name="left" className="size-5" />
        </Link>
      )}
      {pages.map((p) => (
        <Link
          key={p}
          href={href(p)}
          aria-current={p === page ? 'page' : undefined}
          className={`grid h-9 min-w-9 place-items-center rounded-full px-2 font-tech text-sm font-black transition duration-react active:scale-95 ${
            p === page ? 'bg-miku text-on-miku' : 'text-accent hover:bg-hover-accent'
          }`}
        >
          {p}
        </Link>
      ))}
      {page < last && (
        <Link href={href(page + 1)} aria-label={t.next} className={arrow}>
          <Icon name="right" className="size-5" />
        </Link>
      )}
    </nav>
  );
}
