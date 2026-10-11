import type { Lang } from '@/i18n/config';
import { producerName } from '@/lib/producer-name';
import { producerNamesFor } from '@/lib/producer-names';
import type { MusicGroup, WithContext } from 'schema-dts';
import { AmbientSource } from '@/components/ambient';
import { JsonLd } from '@/components/json-ld';
import { ProducerHeading } from '@/components/producer-heading';
import { ProducerPlayer } from '@/components/producer-player';
import { type findProducer, queueOf } from '@/lib/catalog';
import { SITE_URL } from '@/lib/site';

/** 検索エンジン向けの情報（JSON-LD）に載せる曲の数 */
const JSON_LD_TRACKS = 20;

/**
 * ボカロPの画面の中身。ボカロPの画面（page.tsx）と、曲を共有したときの住所の画面（songs/[songId]/page.tsx）で使う。
 * linkedSongId は共有された曲。その曲が一覧で目立ち、大きな再生ボタンがその曲からになる
 */
export async function ProducerView({
  found,
  linkedSongId,
  lang,
}: {
  found: NonNullable<Awaited<ReturnType<typeof findProducer>>>;
  linkedSongId?: number;
  lang: Lang;
}) {
  const { producer, links, songs } = found;
  // 画面に出す名前（英語の画面では英語の名前）。お気に入りに残すのは台帳の名前のまま
  const shown = producerName(producer.id, producer.name, await producerNamesFor(lang));
  const queue = queueOf(songs, producer);
  const cover = queue[0]?.thumb ?? null;

  const jsonLd: WithContext<MusicGroup> = {
    '@context': 'https://schema.org',
    '@type': 'MusicGroup',
    name: producer.name,
    ...(shown !== producer.name && { alternateName: shown }),
    url: `${SITE_URL}/producers/${producer.id}`,
    ...(producer.picture && { image: producer.picture }),
    track: songs
      .slice(0, JSON_LD_TRACKS)
      .map((s) => ({ '@type': 'MusicRecording', name: s.title })),
  };

  return (
    <div className="pt-content-top">
      <JsonLd data={jsonLd} />
      <AmbientSource image={cover} />
      <ProducerPlayer
        // 名前は動画の下に出す（YouTube の動画のページと同じ並び）
        heading={
          <ProducerHeading
            id={producer.id}
            name={producer.name}
            shown={shown}
            picture={producer.picture}
            links={links}
          />
        }
        producerId={producer.id}
        producerName={shown}
        linkedSongId={linkedSongId}
        songs={songs}
        queue={queue}
        cover={cover}
      />
    </div>
  );
}
