import { findProducer } from '@/lib/catalog';
import { OG_SIZE, producerImage } from '../../og';

export const alt = 'Vocafy の曲';
export const size = OG_SIZE;
export const contentType = 'image/png';

// 曲を共有したときの住所の絵。ボカロPの画面の絵と同じく、最初に読まれたときに作って配備まで作り置く
export const revalidate = false;

export function generateStaticParams() {
  return [];
}

/** 曲を共有したときの絵。曲名を大きく、その下にボカロPの名前（og.tsx） */
export default async function OpengraphImage({
  params,
}: {
  params: Promise<{ id: string; songId: string }>;
}) {
  const { id, songId } = await params;
  const found = await findProducer(Number(id));
  const song = found?.songs.find((s) => s.id === Number(songId));
  return producerImage(found, song ? { title: song.title } : undefined);
}
