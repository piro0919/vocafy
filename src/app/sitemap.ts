import type { MetadataRoute } from 'next';
import { producers, years } from '@/lib/catalog';
import { SITE_URL } from '@/lib/site';

// 台帳は取り込みのときにしか変わらないので、時間では作り直さず、次の配備まで作ったページを使い回す（DB を起こさないため）。
export const revalidate = false;

/** 一覧と、ボカロPのページと、年のページ。規約と方針のページは検索から入る先ではないので載せない */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [list, yearList] = await Promise.all([producers(), years()]);
  return [
    { url: SITE_URL },
    { url: `${SITE_URL}/producers` },
    { url: `${SITE_URL}/voices` },
    { url: `${SITE_URL}/years` },
    ...list.map((p) => ({ url: `${SITE_URL}/producers/${p.id}` })),
    ...yearList.map((y) => ({ url: `${SITE_URL}/years/${y.year}` })),
  ];
}
