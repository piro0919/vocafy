import Image from 'next/image';
import type { MusicGroup, WithContext } from 'schema-dts';
import { AmbientSource } from '@/components/ambient';
import { FavoriteProducerButton } from '@/components/favorite-button';
import { Heading } from '@/components/heading';
import { JsonLd } from '@/components/json-ld';
import { ProducerLinks } from '@/components/producer-links';
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
          <div className="flex items-center gap-3">
            {producer.picture && (
              <Image
                src={producer.picture}
                alt=""
                width={56}
                height={56}
                className="size-12 shrink-0 rounded-full bg-surface object-cover sm:size-14"
              />
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-3">
                {/* スマホでは、動画の下に名前とボタンを詰めて置くので、ほかの画面の題名より小さくする */}
                <Heading as="h1" size="page" className="max-sm:text-2xl">
                  {producer.name}
                </Heading>
                <FavoriteProducerButton
                  producer={{ id: producer.id, name: producer.name, picture: producer.picture }}
                />
              </div>
              {/* 本人の場所は名前の下に1行で（YouTube のチャンネルの画面と同じ置き場所）。曲数は出さない（右の一覧の番号で分かり、
                  名前の下・リンクの横のどこに置いても浮いた） */}
              <ProducerLinks name={producer.name} links={links} />
            </div>
          </div>
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
