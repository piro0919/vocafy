import type { WebSite, WithContext } from 'schema-dts';
import { ARTIST_SHELF_ITEM, CoverCard } from '@/components/cover-card';
import { JsonLd } from '@/components/json-ld';
import { Shelf } from '@/components/shelf';
import { SongList } from '@/components/song-list';
import { popularSongs, producers } from '@/lib/catalog';
import { SITE_URL } from '@/lib/site';

/** サイトそのものの情報 */
const jsonLd: WithContext<WebSite> = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'Vocafy',
  url: SITE_URL,
};

// 台帳は取り込みのときにしか変わらないので、1時間は作ったページを使い回す
export const revalidate = 3600;

export default async function Home() {
  const [songs, list] = await Promise.all([popularSongs(24), producers()]);
  return (
    <>
      <JsonLd data={jsonLd} />
      <Shelf title="人気曲" eyebrow="Popular">
        <SongList songs={songs} columns />
      </Shelf>

      <Shelf title="ボカロP" eyebrow="Producers" href="/producers">
        {list.slice(0, 30).map((p) => (
          <CoverCard
            key={p.id}
            href={`/producers/${p.id}`}
            playing={{ producerId: p.id }}
            cover={p.picture}
            round
            title={p.name}
            sub={`${p.songCount} 曲`}
            className={ARTIST_SHELF_ITEM}
          />
        ))}
      </Shelf>
    </>
  );
}
