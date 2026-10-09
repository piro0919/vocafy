import type { Engine, EngineEvents, Sound } from './engine';
import { reportUnplayable } from './report';

/**
 * ニコニコの埋め込みプレイヤー（embed.nicovideo.jp）を、postMessage で動かす。
 * 公式の資料は無く、非公式の解説（https://zenn.dev/xpadev/articles/8f742c8f8ce3d0 、2022年時点）と、
 * 2026-10-08 に実物で確かめた動きに合わせている。
 *
 * - 送る: { eventName, data, sourceConnectorType: 1, playerId }。play・pause・seek（data.time はミリ秒）・
 *   volumeChange（data.volume は 0〜1）・mute（data.mute）・commentVisibilityChange（data.commentVisibility）
 * - 届く: loadComplete（読み込めた）、statusChange（data.playerStatus が 1 読み込み中・2 再生中・3 一時停止・
 *   4 終わり）、playerMetadataChange（data.currentTime と data.duration はミリ秒。1秒に4回ほど）、error
 *
 * コメントは隠す。見た目を YouTube の曲とそろえるため（2026-10-08 に本人が決めた）。
 * URL の設定（noController・noHeader・defaultNoComment など）は、2026-10-08 に試した範囲では効かなかった。効いたのは開始位置の from だけ
 *
 * 動画を替えるときは iframe を読み込み直す。前の動画の知らせを拾わないよう、そのたびに playerId を変える
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
): Engine {
  const iframe = document.createElement('iframe');
  iframe.allow = 'autoplay; fullscreen';
  iframe.title = 'ニコニコ動画のプレイヤー';
  container.replaceChildren(iframe);

  let playerId = '';
  /** いま読み込んでいる動画。流せなかったときに知らせる */
  let videoId = firstVideoId;
  let current = 0;
  let duration = 0;
  let volume = sound.volume;
  let muted = sound.muted;

  const send = (eventName: string, data?: Record<string, unknown>) =>
    iframe.contentWindow?.postMessage(
      { eventName, data, sourceConnectorType: 1, playerId },
      ORIGIN,
    );

  const onMessage = (e: MessageEvent<Message>) => {
    if (e.origin !== ORIGIN || e.data?.playerId !== playerId) return;
    const { eventName, data } = e.data;
    if (eventName === 'loadComplete') {
      // コメントを隠し、残しておいた音量にしてから流し始める
      send('commentVisibilityChange', { commentVisibility: false });
      send('volumeChange', { volume: volume / 100 });
      send('mute', { mute: muted });
      send('play');
    }
    if (eventName === 'statusChange') {
      if (data?.playerStatus === 2) events.onPlaying();
      if (data?.playerStatus === 3) events.onPaused();
      if (data?.playerStatus === 4) events.onEnded();
    }
    if (eventName === 'playerMetadataChange') {
      current = (data?.currentTime ?? 0) / 1000;
      duration = (data?.duration ?? 0) / 1000;
    }
    // 消えた・ほかのサイトでは流せない動画。台帳から外せるよう Vocafy に知らせる（確かめ直すのは API の側）
    if (eventName === 'error') {
      reportUnplayable('niconico', videoId);
      events.onError();
    }
  };
  window.addEventListener('message', onMessage);

  let started = false;
  const load = (id: string) => {
    videoId = id;
    playerId = `vocafy-${++serial}`;
    current = 0;
    duration = 0;
    const url = `${ORIGIN}/watch/${encodeURIComponent(id)}?jsapi=1&playerId=${playerId}`;
    // 2曲目からは、埋め込みの中の画面を置き換える。src を書き換えると、ブラウザがページの履歴に1つ積み、
    // 戻る操作の1回目が埋め込みの中を前の動画に戻すのに使われて、ページが戻らなかった。
    // location.replace は、別のサイトの埋め込みにも親から呼べる
    if (started && iframe.contentWindow) iframe.contentWindow.location.replace(url);
    else iframe.src = url;
    started = true;
  };
  load(videoId);

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
      iframe.remove();
    },
  };
}
