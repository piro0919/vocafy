import type { Metadata } from 'next';
import { langOf } from '@/i18n/config';
import { TERMS } from '@/i18n/terms';
import { FavoriteSongs } from './favorite-songs';

export async function generateMetadata({
  params,
}: PageProps<'/[lang]/favorites/songs'>): Promise<Metadata> {
  return { title: TERMS[await langOf(params)].favoriteSongs, robots: { index: false } };
}

/** お気に入りの曲。中身はこのブラウザに残したもの（src/lib/favorites.ts）なので、この画面そのものは作り置きの殻だけ */
export default function FavoriteSongsPage() {
  return (
    <div className="pt-content-top">
      <FavoriteSongs />
    </div>
  );
}
