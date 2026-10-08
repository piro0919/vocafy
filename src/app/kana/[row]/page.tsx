import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Heading } from '@/components/heading';
import { SongList } from '@/components/song-list';
import { songsOfRow } from '@/lib/catalog';
import { isRow, ROW_LABEL, ROWS, type Row } from '@/lib/kana';

// 台帳は取り込みのときにしか変わらないので、1時間は作ったページを使い回す
export const revalidate = 3600;

/** 行は12しかないので、ビルドのときに全部作る */
export function generateStaticParams() {
  return ROWS.map((row) => ({ row }));
}

/** 行の名前。かなの行は「あ行」、それ以外は札の字のまま */
function rowTitle(row: Row): string {
  return row === 'abc' ? 'ABC・数字' : row === 'etc' ? 'そのほか' : `${ROW_LABEL[row]}行`;
}

export async function generateMetadata({ params }: PageProps<'/kana/[row]'>): Promise<Metadata> {
  const row = decodeURIComponent((await params).row);
  return { title: isRow(row) ? `${rowTitle(row)}の曲` : undefined };
}

/** 曲名の頭の文字で引く索引の1行。曲名の順 */
export default async function KanaPage({ params }: PageProps<'/kana/[row]'>) {
  const row = decodeURIComponent((await params).row);
  if (!isRow(row)) notFound();
  const songs = await songsOfRow(row);
  return (
    <>
      <div className="pt-4 pb-4 sm:pb-6">
        <Heading as="h1" size="page" eyebrow="Index">
          {rowTitle(row)}の曲
        </Heading>
        <p className="mt-2 text-sm text-muted">{songs.length} 曲</p>
      </div>
      <SongList songs={songs} className="grid gap-1 md:grid-cols-2 xl:grid-cols-3" />
    </>
  );
}
