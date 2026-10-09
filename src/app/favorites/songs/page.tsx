import type { Metadata } from 'next';
import { FavoriteSongs } from './favorite-songs';

export const metadata: Metadata = { title: 'お気に入りの曲', robots: { index: false } };

/** お気に入りの曲。中身はこのブラウザに残したもの（src/lib/favorites.ts）なので、この画面そのものは作り置きの殻だけ */
export default function FavoriteSongsPage() {
  return (
    <div className="pt-4">
      <FavoriteSongs />
    </div>
  );
}
