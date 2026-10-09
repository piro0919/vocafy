'use client';

import { type ReactNode, useEffect, useState, useSyncExternalStore } from 'react';
import type { QueueItem, Song } from '@/lib/catalog';
import { NO_RESTORE } from '@/lib/no-restore';
import { FavoriteButton } from './favorite-button';
import { Icon } from './icon';
import { Bars } from './now-playing';
import { PlayerStage, SwipeToLeave } from './player-stage';
import { usePlayer } from './player/player-provider';
import { PlaybackMode } from './player/playback-mode';
import { Marquee } from './marquee';

/**
 * ボカロPの画面。左に大きなプレイヤーの置き場所、右に曲の一覧（新しい順）。
 * このボカロPの曲を流している間は、共通のプレイヤーが置き場所に重なって大きく出る。
 * ほかの曲を流しているあいだや、まだ何も流していないときは、サムネイルと再生ボタンを出す
 */
export function ProducerPlayer({
  producerId,
  heading,
  songs,
  queue,
  cover,
}: {
  producerId: number;
  /** 動画の下に出す名前。ページの側で作る */
  heading: ReactNode;
  songs: Song[];
  queue: QueueItem[];
  cover: string | null;
}) {
  const { current, playing, parked, context, playQueue, adoptQueue, toggle } = usePlayer();
  // お気に入りの並びで流している曲は、お気に入りの曲の画面で大きく出す。この人の曲でもここには出さない。
  // 読み込み直して前の曲を帯に出しているだけ（parked）のときは、まだプレイヤーが無いので置き場所を使わない
  const here = !parked && context !== 'favorites' && current?.producerId === producerId;
  // 流せる曲。ニコニコにしか本家が無い曲もニコニコで流せるが、表紙の取れていない曲は流さない
  const playable = new Map(queue.map((q) => [q.songId, q]));

  // 共有されたリンク（?song=曲の id）で来たときの曲。ページは作り置きなので、住所の ?song= はサーバーでは読まずブラウザで読む
  // （サーバーで読むと開くたびに作り直しになり、DB を起こす）。開いただけでは流さない（ブラウザが押す操作の無い再生を止めるため）。
  // その曲を一覧で目立たせ、大きな再生ボタンをその曲からにする
  const linked = useSyncExternalStore(noSubscribe, linkedSong, () => null);
  useEffect(() => {
    if (linked) document.getElementById(`song-${linked}`)?.scrollIntoView({ block: 'center' });
  }, [linked]);
  const linkedItem = !here && linked ? playable.get(linked) : undefined;

  // 曲の一覧から押して来たときは、その1曲だけを流している。曲は止めずに、順番待ちをこの人の曲にする
  useEffect(() => {
    if (!here || !current || context !== 'pending') return;
    const at = queue.findIndex((q) => q.songId === current.songId);
    if (at >= 0) adoptQueue(queue, at);
  }, [here, current, context, queue, adoptQueue]);

  const start = (songId?: number) =>
    playQueue(
      queue,
      songId
        ? Math.max(
            0,
            queue.findIndex((q) => q.songId === songId),
          )
        : 0,
    );

  return (
    // パソコンでは、一覧が長くても動画が隠れないよう、動画と再生ボタンの列ごと上に貼り付ける（sticky。上の段の下に来る高さ）。
    // スマホは画面が狭く、貼り付けると一覧が見づらくなるので、貼り付けずに縦に並べる
    <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:items-start">
      <div className="contents lg:sticky lg:top-21 lg:block">
        <PlayerStage
          active={here}
          cover={linkedItem?.thumb ?? cover}
          label={linkedItem ? `「${linkedItem.title}」を再生` : 'このボカロPの曲を再生'}
          onPlay={() => start(linkedItem?.songId)}
        />
        <SwipeToLeave className="lg:mt-4">{heading}</SwipeToLeave>
        <div className="flex items-center gap-2 lg:mt-4">
          <button
            type="button"
            onClick={() => (here ? toggle() : start(linkedItem?.songId))}
            className="flex shrink-0 items-center gap-2 rounded-full py-2 pr-5 pl-4 text-sm font-bold whitespace-nowrap bg-miku text-on-miku shadow-lg shadow-miku/30 transition-[filter,scale] duration-150 ease-out hover:brightness-110 active:scale-95"
          >
            <Icon name={here && playing ? 'pause' : 'play'} className="size-5" />
            {here && playing ? '一時停止' : '再生'}
          </button>
          <ShareButton
            producerId={producerId}
            songId={here ? current?.songId : linkedItem?.songId}
          />
          {/* スマホは下の帯にランダムとループが入りきらないので、ここに置く */}
          <PlaybackMode className="md:hidden" />
        </div>
      </div>

      {/*
        行の地の色は字の手前まで広げたいので、行の内側に余白（px-3）を取る。そのぶん並び全体を外へ出し（-mx-3）、
        番号の頭が題名の頭とそろうようにする
      */}
      <ol className="-mx-3">
        {songs.map((song, i) => {
          const active = here && current?.songId === song.id;
          const item = playable.get(song.id);
          return (
            <li
              key={song.id}
              id={`song-${song.id}`}
              className={`group flex items-center rounded-md pr-1 transition-colors duration-150 ${
                active || linkedItem?.songId === song.id
                  ? 'bg-sidebar/60'
                  : item
                    ? 'hover:bg-foreground/8'
                    : ''
              }`}
            >
              <button
                type="button"
                disabled={!item}
                {...NO_RESTORE}
                title={item ? undefined : 'この曲は本家の動画の情報が足りず、再生できません'}
                onClick={() => item && start(song.id)}
                className="flex min-w-0 flex-1 items-center gap-4 px-3 py-2 text-left disabled:cursor-default disabled:text-muted/50"
              >
                <span className="flex w-6 shrink-0 justify-end text-sm tabular-nums text-muted">
                  {active ? <Bars playing={playing} /> : i + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <Marquee active={active} className={active ? 'font-bold' : ''}>
                    {song.title}
                  </Marquee>
                  <span className="block truncate text-xs text-muted">
                    {song.vocalists.join('・')}
                    {song.year && ` ・ ${song.year}年`}
                  </span>
                </span>
              </button>
              {item && <FavoriteButton song={item} />}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/** 住所は画面の中では変わらないので、見張らない */
const noSubscribe = () => () => {};

/** 住所の ?song= の曲の id。無ければ null */
function linkedSong(): number | null {
  const id = Number(new URLSearchParams(window.location.search).get('song'));
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

/**
 * 共有のボタン。この人の曲を流しているときは、その曲つきのリンク（?song=）を共有する。開いた人の画面ではその曲から流せる。
 * スマホなど共有の窓（Web Share API）が出せるブラウザでは窓を出し、出せなければリンクを写す
 */
function ShareButton({ producerId, songId }: { producerId: number; songId?: number }) {
  const [copied, setCopied] = useState(false);
  // 共有の窓が出せないブラウザ（パソコンの多く）では、押すとリンクを写すだけなので、初めからそう書く。
  // サーバーでは分からないので「共有」で作り、ブラウザで読み直す
  const canShare = useSyncExternalStore(
    noSubscribe,
    () => 'share' in navigator,
    () => true,
  );
  const what = songId ? 'この曲' : 'このボカロP';
  const share = async () => {
    const url = new URL(`/producers/${producerId}`, window.location.origin);
    if (songId) url.searchParams.set('song', String(songId));
    const link = url.toString();
    if (canShare) {
      // 窓を閉じただけでも失敗が返るので、何もしない
      await navigator.share({ url: link }).catch(() => {});
      return;
    }
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      type="button"
      onClick={share}
      aria-label={canShare ? `${what}を共有` : `${what}のリンクをコピー`}
      title={canShare ? `${what}を共有` : `${what}のリンクをコピー`}
      className="flex shrink-0 items-center gap-1.5 rounded-full px-3 py-2 text-sm font-bold whitespace-nowrap text-muted transition-[color,scale] duration-150 ease-out hover:text-foreground active:scale-95"
    >
      <Icon name="share" className="size-5" />
      <span aria-live="polite">
        {copied ? 'コピーしました' : canShare ? '共有' : 'リンクをコピー'}
      </span>
    </button>
  );
}
