import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { findProducer } from '@/lib/catalog';
import { SITE_URL } from '@/lib/site';
import { ProducerView } from '../../producer-view';

/**
 * 曲を共有したときの住所（2026-10-11）。中身はボカロPの画面と同じで、その曲が一覧で目立ち、大きな再生ボタンがその曲からになる。
 * 題名と共有の絵に曲名を入れるために、住所の ?song= ではなく道で曲を受け取る（?song= はサーバーで読むと作り置きが効かない）。
 * ボカロPの画面と同じく、最初に開かれたときに作って配備まで作り置く。サイトマップには載せず、検索にも載せない（noindex）。
 * 作られるのは共有されて開かれた曲だけなので、DB はほとんど起きない。曲ごとのページを作らないと決めた理由（検索エンジンが
 * 2万5千ページを巡回して Neon が休めない）には当たらない
 */
export const revalidate = false;

export function generateStaticParams() {
  return [];
}

async function load(params: PageProps<'/producers/[id]/songs/[songId]'>['params']) {
  const { id, songId } = await params;
  const found = await findProducer(Number(id));
  const song = found?.songs.find((s) => s.id === Number(songId));
  return found && song ? { found, song } : null;
}

export async function generateMetadata({
  params,
}: PageProps<'/producers/[id]/songs/[songId]'>): Promise<Metadata> {
  const loaded = await load(params);
  if (!loaded) return {};
  const { found, song } = loaded;
  return {
    title: `${song.title} - ${found.producer.name}`,
    robots: { index: false, follow: true },
    alternates: { canonical: `${SITE_URL}/producers/${found.producer.id}` },
  };
}

export default async function SongSharePage({
  params,
}: PageProps<'/producers/[id]/songs/[songId]'>) {
  const loaded = await load(params);
  if (!loaded) notFound();
  return <ProducerView found={loaded.found} linkedSongId={loaded.song.id} />;
}
