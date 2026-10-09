import type { Metadata } from 'next';
import { Heading } from '@/components/heading';
import { FavoritesView } from './favorites-view';

export const metadata: Metadata = { title: 'お気に入り', robots: { index: false } };

/**
 * お気に入りの曲。中身はこのブラウザに残したもの（src/lib/favorites.ts）なので、この画面そのものは作り置きの殻だけ
 */
export default function FavoritesPage() {
  return (
    <>
      <div className="pt-4 pb-4 sm:pb-6">
        <Heading as="h1" size="page" eyebrow="Favorites">
          お気に入り
        </Heading>
      </div>
      <FavoritesView />
    </>
  );
}
