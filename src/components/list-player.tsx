'use client';

import { useMemo } from 'react';
import type { QueueItem } from '@/lib/catalog';
import { StagePlayButton } from './player-stage';
import { SongShare } from './share-menu';
import { usePlayer } from './player/player-provider';
import { VirtualSongList } from './virtual-song-list';
import { StageLayout } from './stage-layout';
import { StageHeading } from './stage-heading';
import { useTakeOver } from './player/use-take-over';
import { useLinkedSong, useSongInUrl } from './player/use-song-in-url';

/**
 * 一覧（年・日付・歌声の年）の再生用の画面。ボカロPの画面と同じく、左（スマホは上）に大きなプレイヤーの
 * 置き場所、右に一覧。一覧の画面の「すべて再生」を押すとここへ移る（play-all.tsx）。
 * この一覧を流しているあいだ（並びの持ち主がこの一覧）は、共通のプレイヤーが置き場所に重なって大きく出る。
 * 一覧の曲を押すと、ボカロPの画面へは移らず、この一覧のその曲から流す。流している曲は住所に入れる（?song=）。
 * 一覧は全部を描かず、見えている行だけを描く（VirtualSongList）。流すのも、終わりが近づいたら次のページを読み足す
 */
export function ListPlayer({
  source,
  eyebrow,
  title,
  songs,
}: {
  /** 一覧の住所（years/2026 など） */
  source: string;
  /** 動画の下に出す題名。ページの側で作る */
  /** 動画の下の題名（stage-heading.tsx） */
  eyebrow: string;
  title: string;
  /** 流す曲（catalog.ts の Playlist。全曲か、全曲から選んだ PICKUP_SIZE 曲） */
  songs: QueueItem[];
}) {
  const { current, playing, playAll, toggle } = usePlayer();
  // 流している曲がこの一覧にあれば、開いたときに並びをこの一覧にする（use-take-over.ts。どの画面も同じ決まり）。
  // 流すのは songs だけ（多くても PICKUP_SIZE 曲で、1ページに収まる）
  const owner = useMemo(() => ({ kind: 'list' as const, source }), [source]);
  // この一覧を流しているときに、動画をここに大きく出す
  const here = useTakeOver(songs, owner);

  // 共有されたり読み込み直したりした住所の曲。一覧にあれば、そこから流す
  const linked = useLinkedSong();
  const linkedAt = linked ? songs.findIndex((s) => s.songId === linked) : -1;
  const linkedItem = !here && linkedAt >= 0 ? songs[linkedAt] : undefined;

  const play = (page: { songs: QueueItem[] }, at: number) =>
    page.songs.length > 0 && playAll(page.songs, source, { at });
  // 住所の曲（共有されたり読み込み直したりしたとき）が一覧にあれば、そこから流す。無ければ先頭から
  const start = () => play({ songs }, Math.max(0, linkedAt));

  // この一覧を流しているあいだは、住所に流している曲を入れる（use-song-in-url.ts）
  useSongInUrl(here ? current : null, `/${source}/play`);

  return (
    <StageLayout
      song={here ? current : null}
      cover={linkedItem?.thumb ?? songs[0]?.thumb ?? null}
      label={linkedItem ? `「${linkedItem.title}」から再生` : 'この一覧を再生'}
      onPlay={start}
      heading={<StageHeading eyebrow={eyebrow} title={title} song={here ? current : null} />}
      play={
        <StagePlayButton playing={here && playing} onClick={() => (here ? toggle() : start())} />
      }
      share={<SongShare song={here ? current : null} />}
    >
      <div className="-mx-1.5">
        <VirtualSongList
          source={source}
          page={1}
          songs={songs}
          total={songs.length}
          columns={1}
          onOpen={play}
        />
      </div>
    </StageLayout>
  );
}
