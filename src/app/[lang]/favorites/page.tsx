import type { Metadata } from 'next';
import { Link } from '@/i18n/navigation';
import { PILL } from '@/components/button-styles';
import { Heading } from '@/components/heading';
import { langOf } from '@/i18n/config';
import { TERMS } from '@/i18n/terms';
import { FavoritesView } from './favorites-view';

export async function generateMetadata({
  params,
}: PageProps<'/[lang]/favorites'>): Promise<Metadata> {
  return { title: TERMS[await langOf(params)].favorites, robots: { index: false } };
}

/**
 * お気に入りの曲。中身はこのブラウザに残したもの（src/lib/favorites.ts）なので、この画面そのものは作り置きの殻だけ
 */
export default async function FavoritesPage({ params }: PageProps<'/[lang]/favorites'>) {
  const t = TERMS[await langOf(params)];
  return (
    <>
      <div className="flex items-end gap-3 pt-4 pb-4 sm:pb-6">
        <Heading as="h1" size="page" eyebrow="Favorites">
          {t.favorites}
        </Heading>
        {/* スマホの履歴の入り口。下のタブは5つで埋まっている。パソコンは左のメニューから行く */}
        <Link href="/history" className={`${PILL} mb-1 ml-auto md:hidden`}>
          {t.history}
        </Link>
      </div>
      <FavoritesView />
    </>
  );
}
