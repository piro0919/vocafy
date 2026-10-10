import type { MusicGroup, WithContext } from 'schema-dts';
import { AmbientSource } from '@/components/ambient';
import { JsonLd } from '@/components/json-ld';
import { ProducerHeading } from '@/components/producer-heading';
import { ProducerPlayer } from '@/components/producer-player';
import { type findProducer, queueOf } from '@/lib/catalog';
import { SITE_URL } from '@/lib/site';

/**
 * ボカロPの画面の中身。ボカロPの画面（page.tsx）と、曲を共有したときの住所の画面（songs/[songId]/page.tsx）で使う。
 * linkedSongId は共有された曲。その曲が一覧で目立ち、大きな再生ボタンがその曲からになる
 */
export function ProducerView({
  found,
  linkedSongId,
}: {
  found: NonNullable<Awaited<ReturnType<typeof findProducer>>>;
  linkedSongId?: number;
}) {
  const { producer, links, songs } = found;
  const queue = queueOf(songs, producer);
  const cover = queue[0]?.thumb ?? null;

  const jsonLd: WithContext<MusicGroup> = {
    '@context': 'https://schema.org',
    '@type': 'MusicGroup',
    name: producer.name,
    url: `${SITE_URL}/producers/${producer.id}`,
    ...(producer.picture && { image: producer.picture }),
    track: songs.slice(0, 20).map((s) => ({ '@type': 'MusicRecording', name: s.title })),
  };

  return (
    <div className="pt-4">
      <JsonLd data={jsonLd} />
      <AmbientSource image={cover} />
      <ProducerPlayer
        // 名前は動画の下に出す（YouTube の動画のページと同じ並び）
        heading={
          <ProducerHeading
            id={producer.id}
            name={producer.name}
            picture={producer.picture}
            links={links}
          />
        }
        producerId={producer.id}
        linkedSongId={linkedSongId}
        songs={songs}
        queue={queue}
        cover={cover}
      />
    </div>
  );
}
