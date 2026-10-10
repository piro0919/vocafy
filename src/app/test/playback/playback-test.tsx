'use client';

import { useEffect, useRef, useState } from 'react';
import { PILL } from '@/components/button-styles';
import { Heading } from '@/components/heading';
import { usePlayer } from '@/components/player/player-provider';
import type { QueueItem } from '@/lib/catalog';
import { thumbOf } from '@/lib/thumb';

const PRODUCER = { producerId: 11630, producerName: 'Orangestar' };
const yt = (songId: number, title: string, videoId: string, vocalists: string): QueueItem => ({
  songId,
  title,
  service: 'youtube',
  videoId,
  thumb: thumbOf(videoId),
  vocalists,
  ...PRODUCER,
});
const nico = (songId: number, title: string, videoId: string, vocalists: string): QueueItem => ({
  songId,
  title,
  service: 'niconico',
  videoId,
  thumb: `https://nicovideo.cdn.nimg.jp/thumbnails/${videoId.slice(2)}/${videoId.slice(2)}`,
  vocalists,
  ...PRODUCER,
});

const Y1 = yt(651819, '白南風', 'GRyE06Q4OYU', 'IA');
const Y2 = yt(651821, 'Postscript', 'gG3hOMn2zas', '初音ミク');
const Y3 = yt(586628, 'Encounter', 'EUMn-kJbNc0', '初音ミク');
const N1 = nico(1041647, '楽園', 'sm46875288', 'ナースロボ＿タイプＴ');
const N2 = nico(68834, '悪性新生物', 'sm21529681', 'IA');
const N3 = nico(35928, '突風マニュアル', 'sm21495069', 'IA');

const PATTERNS: { name: string; songs: QueueItem[] }[] = [
  { name: 'YouTube だけ', songs: [Y1, Y2, Y3] },
  { name: 'YouTube → ニコニコ → YouTube', songs: [Y1, N1, Y2] },
  { name: 'YouTube → ニコニコ2曲 → YouTube', songs: [Y1, N1, N2, Y2] },
  { name: 'ニコニコから始める', songs: [N1, Y1, Y2] },
  { name: 'ニコニコだけ', songs: [N1, N2, N3] },
];

/** 押してからの秒数を測る時計。押したときと、状態が変わったとき（エフェクトの中）にだけ読む */
const now = () => performance.now();

const label = (s: QueueItem) => `${s.title}（${s.service === 'youtube' ? 'YouTube' : 'ニコニコ'}）`;

export function PlaybackTest() {
  const { current, playing, loading, time, playQueue, seek, preload } = usePlayer();
  // 曲の行と同じく、ニコニコから始まる並びの1曲目を先に読み込んでおく（iPad・iPhone だけ）
  useEffect(() => {
    const releases = PATTERNS.map((p) => p.songs[0]).flatMap((s) =>
      s?.service === 'niconico' ? [preload(s.videoId)] : [],
    );
    return () => {
      for (const release of releases) release();
    };
  }, [preload]);
  const [log, setLog] = useState<string[]>([]);
  const started = useRef(0);

  // 曲と再生の状態が変わるたびに、押してからの秒数を添えて残す
  const state = current
    ? `${label(current)} ${loading ? '読み込み中' : playing ? '再生中' : '停止'}`
    : null;
  useEffect(() => {
    if (!state || started.current === 0) return;
    const at = ((now() - started.current) / 1000).toFixed(1);
    setLog((l) => [...l, `${at}秒 ${state}`]);
  }, [state]);

  const start = (songs: QueueItem[]) => {
    started.current = now();
    setLog([]);
    playQueue(songs, 0);
  };

  return (
    <div className="space-y-10 pb-64">
      <section>
        <Heading eyebrow="Patterns">並び</Heading>
        <ul className="divide-y divide-line/60">
          {PATTERNS.map((p) => (
            <li key={p.name} className="flex items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <p className="font-bold">{p.name}</p>
                <p className="text-sm text-muted">{p.songs.map((s) => s.title).join(' → ')}</p>
              </div>
              <button type="button" onClick={() => start(p.songs)} className={PILL}>
                再生
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <Heading eyebrow="Now">いまの曲</Heading>
        <p>{state ?? '流していない'}</p>
        <p className="text-sm text-muted">
          {Math.floor(time.current)}秒 / {Math.floor(time.duration)}秒
        </p>
        <button
          type="button"
          onClick={() => seek(Math.max(0, time.duration - 5))}
          disabled={!current || time.duration === 0}
          className={`${PILL} mt-3 disabled:opacity-40`}
        >
          終わりの5秒前へ
        </button>
      </section>

      <section>
        <Heading eyebrow="Log">記録</Heading>
        <ol className="space-y-1 text-sm">
          {log.map((line, i) => (
            // 同じ行が並ぶこともあるので、順番で区別する
            <li key={i}>{line}</li>
          ))}
        </ol>
      </section>
    </div>
  );
}
