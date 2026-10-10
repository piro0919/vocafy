'use client';

import { useRouter } from '@bprogress/next/app';
import { useRef } from 'react';
import type { QueueItem } from '@/lib/catalog';
import { PRIMARY_ICON } from './button-styles';
import { Icon } from './icon';
import { usePlayer } from './player/player-provider';

/**
 * パソコンの上の段の、ログインの左のサイコロ（2026-10-11 に本人と決めた。ログインと同じ塗りの丸いボタン）。どの画面からでも、トップのきょうの出会いを
 * 頭から流して再生用の画面（/mix/日付/play）へ移る。トップの区画の「再生」と同じ動き（play-all.tsx の PlayAllPill）で、
 * もうきょうの出会いを流しているときは止めずに移るだけ。曲はこの画面に無いので、押したときに /api/list から取る
 * （指を乗せたときに先に取っておく）。押した操作の外で流し始めることになるが、パソコンのブラウザは一度押した画面なら流す
 */
export function MixButton() {
  const { current, listSource, playAll } = usePlayer();
  const router = useRouter();
  const songs = useRef<{ date: string; promise: Promise<QueueItem[]> } | null>(null);

  // トップと同じく日本の日付で決める（catalog.ts の today）
  const date = () =>
    new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Tokyo' }).format(new Date());

  const load = (day: string) => {
    if (songs.current?.date !== day) {
      const promise = fetch(`/api/list/mix/${day}/1`)
        .then((res) => (res.ok ? (res.json() as Promise<QueueItem[]>) : []))
        .catch(() => []);
      songs.current = { date: day, promise };
    }
    return songs.current.promise;
  };

  const onClick = async () => {
    const day = date();
    const source = `mix/${day}`;
    if (current !== null && listSource === source) {
      router.push(`/${source}/play`);
      return;
    }
    const list = await load(day);
    if (list.length === 0) {
      // 取れなかったら、次に押したときに取り直す
      songs.current = null;
      return;
    }
    playAll(list, { source, start: 1, last: 1 }, { moving: true });
    router.push(`/${source}/play`);
  };

  return (
    <button
      type="button"
      onClick={onClick}
      onPointerEnter={() => void load(date())}
      onFocus={() => void load(date())}
      aria-label="きょうの出会いを再生"
      title="きょうの出会いを再生"
      className={PRIMARY_ICON}
    >
      <Icon name="dice" className="size-5" />
    </button>
  );
}
