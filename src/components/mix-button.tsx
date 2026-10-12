'use client';

import { useRouter, useText } from '@/i18n/navigation';
import { defineText } from '@/i18n/text';
import { useRef } from 'react';
import type { QueueItem } from '@/lib/catalog';
import { HEADER_ICON } from './button-styles';
import { Icon } from './icon';
import { playStart } from './player/play-order';
import { usePlayer } from './player/player-provider';
import { today } from '@/lib/iso-date';

const TEXT = defineText({ ja: { play: 'きょうの出会いを再生' }, en: { play: 'Play Daily Mix' } });

/**
 * 上の帯（スマホ）と上の段（パソコン）の、ログインの左のサイコロ（2026-10-11 に本人と決めた。2026-10-12 に塗った丸から、虫めがねなどと同じ灰色のアイコンにした）。どの画面からでも、トップのきょうの出会いを
 * どこかの曲から流して再生用の画面（/mix/日付/play）へ移る。トップの区画の「再生」と同じ動き（play-all.tsx の PlayAllPill）で、
 * もうきょうの出会いを流しているときは止めずに移るだけ。曲はこの画面に無いので、押したときに /api/list から取る
 * （指を乗せたときに先に取っておく）。押した操作の外で流し始めることになるが、パソコンのブラウザは一度押した画面なら流す
 */
export function MixButton() {
  const { current, owner, playAll } = usePlayer();
  const router = useRouter();
  const t = useText(TEXT);
  const songs = useRef<{ date: string; promise: Promise<QueueItem[]> } | null>(null);

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
    const day = today();
    const source = `mix/${day}`;
    if (current !== null && owner.kind === 'list' && owner.source === source) {
      router.push(`/${source}/play`);
      return;
    }
    const list = await load(day);
    if (list.length === 0) {
      // 取れなかったら、次に押したときに取り直す
      songs.current = null;
      return;
    }
    playAll(list, source, { at: playStart(list.length, true), moving: true });
    router.push(`/${source}/play`);
  };

  return (
    <button
      type="button"
      onClick={onClick}
      onPointerEnter={() => void load(today())}
      onPointerDown={() => void load(today())}
      onFocus={() => void load(today())}
      aria-label={t.play}
      title={t.play}
      className={`grid ${HEADER_ICON}`}
    >
      <Icon name="dice" className="size-5" />
    </button>
  );
}
