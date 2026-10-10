import type { Engine, EngineEvents, Sound } from './engine';
import type { Preloaded } from './niconico-pool';
import { reportUnplayable } from './report';

/** 埋め込みが statusChange で知らせる再生の状態の番号 */
const STATUS = { playing: 2, paused: 3, ended: 4 } as const;

/**
 * ニコニコの埋め込みプレイヤー（embed.nicovideo.jp）を、postMessage で動かす。
 * 公式の資料は無く、非公式の解説（https://zenn.dev/xpadev/articles/8f742c8f8ce3d0 、2022年時点）と、
 * 2026-10-08 に実物で確かめた動きに合わせている。
 *
 * - 送る: { eventName, data, sourceConnectorType: 1, playerId }。play・pause・seek（data.time はミリ秒）・
 *   volumeChange（data.volume は 0〜1）・mute（data.mute）・commentVisibilityChange（data.commentVisibility）
 * - 届く: loadComplete（読み込めた）、statusChange（data.playerStatus が 1 読み込み中・2 再生中・3 一時停止・
 *   4 終わり）、playerMetadataChange（data.currentTime と data.duration はミリ秒。1秒に4回ほど）、error、
 *   player-error:video:play（再生の開始を止められた）
 *
 * コメントは隠す。見た目を YouTube の曲とそろえるため（2026-10-08 に本人が決めた）。
 * URL の設定（noController・noHeader・defaultNoComment など）は効かない。効くのは jsapi・playerId・開始位置の from（秒）だけ。
 * 2026-10-09 に埋め込みのページと本体の JavaScript を読んで確かめた。noController などの値はニコニコのサーバーがページに
 * 書き込んでいて、URL に付けても変わらない（提携先にだけ開いているとみられる）
 *
 * 動画を替えるときは iframe を作り直す（load の説明）。前の動画の知らせを拾わないよう、そのたびに playerId を変える
 */
const ORIGIN = 'https://embed.nicovideo.jp';

type Message = {
  eventName?: string;
  playerId?: string;
  data?: {
    playerStatus?: number;
    currentTime?: number;
    duration?: number;
  };
};

let serial = 0;

export function createNiconicoEngine(
  container: HTMLElement,
  firstVideoId: string,
  sound: Sound,
  events: EngineEvents,
  /** 先に読み込んでおいた埋め込み（niconico-pool.ts）。あればそれを使い、押した操作の中ですぐ流し始める */
  preloaded?: Preloaded,
): Engine {
  let iframe: HTMLIFrameElement | null = null;

  let playerId = '';
  /** いま読み込んでいる動画。流せなかったときに知らせる */
  let videoId = firstVideoId;
  let current = 0;
  let duration = 0;
  let volume = sound.volume;
  let muted = sound.muted;

  const send = (eventName: string, data?: Record<string, unknown>) =>
    iframe?.contentWindow?.postMessage(
      { eventName, data, sourceConnectorType: 1, playerId },
      ORIGIN,
    );

  // コメントを隠し、残しておいた音量にしてから流し始める
  const start = () => {
    send('commentVisibilityChange', { commentVisibility: false });
    send('volumeChange', { volume: volume / 100 });
    send('mute', { mute: muted });
    send('play');
  };

  const onMessage = (e: MessageEvent<Message>) => {
    if (e.origin !== ORIGIN || e.data?.playerId !== playerId) return;
    const { eventName, data } = e.data;
    if (eventName === 'loadComplete') start();
    if (eventName === 'statusChange') {
      if (data?.playerStatus === STATUS.playing) events.onPlaying();
      if (data?.playerStatus === STATUS.paused) events.onPaused();
      if (data?.playerStatus === STATUS.ended) events.onEnded();
    }
    if (eventName === 'playerMetadataChange') {
      current = (data?.currentTime ?? 0) / 1000;
      duration = (data?.duration ?? 0) / 1000;
    }
    // 押す操作の無い再生をブラウザに止められた。状態は読み込み中のまま何も届かない。
    // ボタンから play を送り直せば流れる（2026-10-09 に Chromium の設定で止めて確かめた）
    if (eventName === 'player-error:video:play') events.onBlocked();
    // 消えた・ほかのサイトでは流せない動画。台帳から外せるよう Vocafy に知らせる（確かめ直すのは API の側）
    if (eventName === 'error') {
      reportUnplayable('niconico', videoId);
      events.onError();
    }
  };
  window.addEventListener('message', onMessage);

  const load = (id: string) => {
    videoId = id;
    playerId = `vocafy-${++serial}`;
    current = 0;
    duration = 0;
    // 動画を替えるたびに、埋め込みごと作り直す。読み込み先（src）を付けてから置くので、ページの履歴は増えない。
    // - src を書き換えると、ブラウザがページの履歴に1つ積み、戻る操作の1回目が埋め込みの中を前の動画に戻すのに
    //   使われて、ページが戻らなかった
    // - 埋め込みの中だけを location.replace で置き換えていたころは、src が1曲目のまま残った。Android で、2曲目を
    //   流したあと画面を移ると、埋め込みが読み込み直されて1曲目が出て、playerId も合わず止まった（2026-10-09）
    const next = document.createElement('iframe');
    next.allow = 'autoplay; fullscreen';
    next.title = 'ニコニコ動画のプレイヤー';
    next.src = `${ORIGIN}/watch/${encodeURIComponent(id)}?jsapi=1&playerId=${playerId}`;
    container.replaceChildren(next);
    iframe = next;
  };
  if (preloaded) {
    iframe = preloaded.iframe;
    playerId = preloaded.playerId;
    start();
  } else load(videoId);

  return {
    service: 'niconico',
    load,
    play: () => send('play'),
    pause: () => send('pause'),
    seek: (seconds) => {
      current = seconds;
      send('seek', { time: seconds * 1000 });
    },
    setVolume: (v) => {
      volume = v;
      send('volumeChange', { volume: v / 100 });
    },
    setMuted: (m) => {
      muted = m;
      send('mute', { mute: m });
    },
    time: () => ({ current, duration }),
    destroy: () => {
      window.removeEventListener('message', onMessage);
      iframe?.remove();
    },
  };
}
