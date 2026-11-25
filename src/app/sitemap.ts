import type { MetadataRoute } from 'next';
import { producers, years } from '@/lib/catalog';
import { isIndexedProducer, languageUrls, SITE_URL } from '@/lib/site';
import { LANGS, localize } from '@/i18n/config';

// 台帳は取り込みのときにしか変わらないので、時間では作り直さず、次の配備まで作ったページを使い回す（DB を起こさないため）。
export const revalidate = false;

/**
 * 一覧と、ボカロPのページと、年のページ。規約と方針のページは検索から入る先ではないので載せない。
 * 曲の少ないボカロPのページは noindex なので載せない（site.ts の MIN_INDEXED_SONGS）。
 * どのページも日本語と英語の両方を載せ、互いを同じページの別の言語として示す（hreflang。ページの中にも同じものを書く）
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [list, yearList] = await Promise.all([producers(), years()]);
  const paths = [
    '/',
    '/producers',
    '/voices',
    '/years',
    ...list.filter((p) => isIndexedProducer(p.songCount)).map((p) => `/producers/${p.id}`),
    ...yearList.map((y) => `/years/${y.year}`),
  ];
  return paths.flatMap((path) =>
    LANGS.map((lang) => ({
      url: `${SITE_URL}${localize(path, lang)}`,
      alternates: { languages: languageUrls(path) },
    })),
  );
}
