'use client';

import { useEffect, useState } from 'react';
import type { QueueItem } from '@/lib/catalog';
import { usePlayer } from './player/player-provider';
import { Heading } from './heading';
import { ProducerHeading } from './producer-heading';
import type { ProducerLinks as Links } from '@/lib/catalog';

type ProducerInfo = { id: number; name: string; picture: string | null; links: Links };

/** 引いたボカロPの名前と画像（id ごと）。画面を移っても残す */
const known = new Map<number, ProducerInfo>();

/**
 * 動画を大きく出す画面（お気に入りの曲・一覧の再生用・ラジオ）の、動画の下の題名。
 * その画面の並びを流しているあいだ（song）は、流している曲のボカロPのアイコンと名前を大きく出し、押すとその人の画面へ移る。
 * 組み立てはボカロPの画面の題名と同じで、名前の下に本人の場所（X など）を並べる。何の画面かを示す英字は出さない
 * （英字を上や名前の下に置く形も試したが、名前を押して移ったときにずれ、スマホでは狭かった）。流していないときは、いままでどおり題名を出す（2026-10-11 に本人と決めた。
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
  // 画面を移るあいだ（holdSlot。ボカロPの名前を押してその人の画面へ移るときなど）は、この画面がもう並びの持ち主でなくても、
  // 直前まで出していたボカロPを出し続ける。出し続けないと、移り終えるまでの一瞬だけ、この画面の題名に戻った
  const { holdingSlot } = usePlayer();
  const [last, setLast] = useState(song);
  if (song && song !== last) setLast(song);
  song = song ?? (holdingSlot ? last : null);
  const producer = useProducer(song?.producerId ?? null);
  // 次に流れる曲のボカロPを先に取っておき、曲が替わったときにすぐ出せるようにする
  const { upcoming, followProducer } = usePlayer();
  const next = song ? upcoming()[0]?.item.producerId : undefined;
  useEffect(() => {
    if (next !== undefined) void loadProducer(next);
  }, [next]);
  if (!song) {
    return (
      // 流しているとき（とボカロPの画面）の題名と同じ高さを取る（スマホ 76px・パソコン 81px。名前の行とリンクの行）。
      // 取らないと、再生を始めたときと止めたときに、下の「再生」の段がずれた
      <div className="min-h-19 sm:min-h-20.25">
        <Heading as="h1" size="page" eyebrow={eyebrow}>
          {title}
        </Heading>
      </div>
    );
  }
  // ボカロPの画面の題名と同じ部品（producer-heading.tsx）。名前を押してその人の画面へ移ったときに位置がずれない。
  // 画面の題名は読み上げにだけ残す
  return (
    <div>
      <h1 className="sr-only">{title}</h1>
      <ProducerHeading
        id={song.producerId}
        name={producer?.name ?? song.producerName}
        picture={producer ? producer.picture : undefined}
        links={producer?.links}
        as="h2"
        link
        // 押したら、並びをそのボカロPの曲にしてから移る。お気に入りなどの並びのまま移ると、ボカロPの画面は並びの持ち主でないので
        // 動画が右下の窓に縮んだ（2026-10-11 に本人と決めた。お気に入りなどの並びはそこで終わる）
        onFollow={followProducer}
      />
    </div>
  );
}

/** 読み込み中のボカロP（同じ人を二重に取りに行かない） */
const loading = new Map<number, Promise<ProducerInfo | null>>();

/** ボカロPの名前・画像・本人の場所を取る（/api/producer/[id]）。取ったものは known に残す */
function loadProducer(id: number): Promise<ProducerInfo | null> {
  const got = known.get(id);
  if (got) return Promise.resolve(got);
  let pending = loading.get(id);
  if (!pending) {
    pending = fetch(`/api/producer/${id}`)
      .then((res) => (res.ok ? (res.json() as Promise<ProducerInfo>) : null))
      .then((info) => {
        if (info) known.set(id, info);
        return info;
      })
      .catch(() => null)
      .finally(() => loading.delete(id));
    loading.set(id, pending);
  }
  return pending;
}

/** ボカロPの名前と画像と本人の場所。取れるまでは null */
function useProducer(id: number | null): ProducerInfo | null {
  const [loaded, setLoaded] = useState<ProducerInfo | null>(null);
  useEffect(() => {
    if (id === null || known.has(id)) return;
    let alive = true;
    void loadProducer(id).then((info) => {
      if (alive && info) setLoaded(info);
    });
    return () => {
      alive = false;
    };
  }, [id]);
  if (id === null) return null;
  return known.get(id) ?? (loaded?.id === id ? loaded : null);
}
