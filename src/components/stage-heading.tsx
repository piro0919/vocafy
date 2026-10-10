'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { QueueItem } from '@/lib/catalog';
import { FavoriteProducerButton } from './favorite-button';
import { Heading } from './heading';

type ProducerInfo = { id: number; name: string; picture: string | null };

/** 引いたボカロPの名前と画像（id ごと）。画面を移っても残す */
const known = new Map<number, ProducerInfo>();

/**
 * 動画を大きく出す画面（お気に入りの曲・一覧の再生用・ラジオ）の、動画の下の題名。
 * その画面の並びを流しているあいだ（song）は、流している曲のボカロPのアイコンと名前を大きく出し、押すとその人の画面へ移る。
 * その画面の題名は、上に小さく残す。流していないときは、いままでどおり題名を出す（2026-10-11 に本人と決めた。
 * 曲ごとに別のボカロPに替わる並びで、流している曲のボカロPの画面へ飛ぶ道が、再生の帯の名前しか無かった。
 * YouTube の動画の画面も、動画のすぐ下にチャンネルを置く）
 */
export function StageHeading({
  eyebrow,
  title,
  song,
}: {
  eyebrow: string;
  title: string;
  song: QueueItem | null;
}) {
  const producer = useProducer(song?.producerId ?? null);
  if (!song) {
    return (
      <Heading as="h1" size="page" eyebrow={eyebrow}>
        {title}
      </Heading>
    );
  }
  const name = producer?.name ?? song.producerName;
  return (
    <div>
      <h1 className="mb-2 text-sm font-bold text-muted">{title}</h1>
      <div className="flex items-center gap-3">
        <Link
          href={`/producers/${song.producerId}`}
          className="flex min-w-0 items-center gap-3 transition-opacity duration-150 hover:opacity-80"
        >
          {producer?.picture ? (
            <Image
              src={producer.picture}
              alt=""
              width={56}
              height={56}
              className="size-12 shrink-0 rounded-full bg-surface object-cover sm:size-14"
            />
          ) : (
            <span className="size-12 shrink-0 rounded-full bg-surface sm:size-14" />
          )}
          <span className="min-w-0 truncate font-display text-2xl leading-tight sm:text-3xl">
            {name}
          </span>
        </Link>
        <FavoriteProducerButton
          producer={{ id: song.producerId, name, picture: producer?.picture ?? null }}
        />
      </div>
    </div>
  );
}

/** ボカロPの名前と画像を引く（/api/producer/[id]）。引けるまでは null */
function useProducer(id: number | null): ProducerInfo | null {
  const [loaded, setLoaded] = useState<ProducerInfo | null>(null);
  useEffect(() => {
    if (id === null || known.has(id)) return;
    let alive = true;
    fetch(`/api/producer/${id}`)
      .then((res) => (res.ok ? (res.json() as Promise<ProducerInfo>) : null))
      .then((info) => {
        if (!info) return;
        known.set(id, info);
        if (alive) setLoaded(info);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [id]);
  if (id === null) return null;
  return known.get(id) ?? (loaded?.id === id ? loaded : null);
}
