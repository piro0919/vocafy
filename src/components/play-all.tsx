'use client';

import { useRouter, useText } from '@/i18n/navigation';
import { TERMS } from '@/i18n/terms';
import type { QueueItem } from '@/lib/catalog';
import { Icon } from './icon';
import { playStart } from './player/play-order';
import { usePlayer } from './player/player-provider';
import { PRIMARY } from './button-styles';

/**
 * 曲の一覧（年・歌声・日付）を、その画面の曲の順に通して流すボタン。曲の数を添える。
 * 一覧の曲を押したときは、その曲のボカロPの画面へ移ってその人の曲が続く（song-list.tsx）。
 * こちらはこの一覧の曲だけを流し続け、流し始めてから一覧の再生用の画面へ移る。
 * 流すのは画面に並べた曲（catalog.ts の Playlist。100曲まで）で、一覧の続きのページは読み足さない
 */
/** 一覧を通して流す処理（PlayAll と PlayAllPill で共有する） */
function usePlayAll(songs: QueueItem[], source: string) {
  const { current, playing, owner, playAll, toggle } = usePlayer();
  const router = useRouter();
  // この一覧を流しているか
  const here = current !== null && owner.kind === 'list' && owner.source === source;
  // 流し始めてから一覧の再生用の画面（/years/2026/play など。list-player.tsx）へ移り、そこで動画を大きく出す。
  // 移らないと動画の置き場所が無く、右下の窓で流れていた
  const start = () => {
    playAll(songs, source, { at: playStart(songs.length, true), moving: true });
    router.push(`/${source}/play`);
  };
  return { here, playing, start, toggle, router };
}

export function PlayAll({
  songs,
  count,
  source,
  pickup = false,
}: {
  songs: QueueItem[];
  count: string;
  /** 一覧の住所（years/2010 など） */
  source: string;
  /** 全曲から選んだ曲を流すか（catalog.ts の Playlist）。ランダムの矢印と「ピックアップ」にして、ふつうの「再生」と分ける */
  pickup?: boolean;
}) {
  const { here, playing, start, toggle } = usePlayAll(songs, source);
  const t = useText(TERMS);
  return (
    <div className="mt-3 flex items-center gap-3">
      <button type="button" onClick={() => (here ? toggle() : start())} className={PRIMARY}>
        <Icon name={here && playing ? 'pause' : pickup ? 'shuffle' : 'play'} className="size-5" />
        {here && playing ? t.pause : pickup ? t.pickup : t.play}
      </button>
      {/* 折り返すのは空きの位置だけ。字の間で折ると「（全11,002曲）」の「曲）」だけが次の行に落ちた */}
      <p className="text-sm text-muted [word-break:keep-all]">{count}</p>
    </div>
  );
}

/**
 * トップの区画の見出しの右に置く「再生」（形は題名の下の「再生」と同じ PRIMARY。2026-10-11 に本人と決めた）。押すと一覧を流し始めて、
 * 一覧の再生用の画面へ移る。もうその一覧を流しているときは、止めずに移るだけ（お気に入りの「再生」と同じ）
 */
export function PlayAllPill({
  songs,
  source,
  pickup = false,
}: {
  songs: QueueItem[];
  /** 一覧の住所（years/2010 など） */
  source: string;
  /** 全曲から選んだ曲を流すか（PlayAll と同じ） */
  pickup?: boolean;
}) {
  const { here, start, router } = usePlayAll(songs, source);
  const t = useText(TERMS);
  return (
    <button
      type="button"
      onClick={() => (here ? router.push(`/${source}/play`) : start())}
      className={PRIMARY}
    >
      <Icon name={pickup ? 'shuffle' : 'play'} className="size-5" />
      {pickup ? t.pickup : t.play}
    </button>
  );
}
