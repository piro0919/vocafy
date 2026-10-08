import type { MetadataRoute } from 'next';
import { producers } from '@/lib/catalog';
import { SITE_URL } from '@/lib/site';

// 台帳は取り込みのときにしか変わらないので、1時間は作ったものを使い回す
export const revalidate = 3600;

/** 一覧と、ボカロPのページ。規約と方針のページは検索から入る先ではないので載せない */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const list = await producers();
  return [
    { url: SITE_URL },
    { url: `${SITE_URL}/producers` },
    ...list.map((p) => ({ url: `${SITE_URL}/producers/${p.id}` })),
  ];
}
