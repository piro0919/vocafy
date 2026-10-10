import type { Engine, EngineEvents, Sound } from './engine';
import { reportUnplayable } from './report';

// YouTube の IFrame API のうち、使う分だけの型と読み込み
type YTPlayer = {
  loadVideoById(id: string): void;
  playVideo(): void;
  pauseVideo(): void;
  stopVideo(): void;
  seekTo(seconds: number, allowSeekAhead: boolean): void;
  getCurrentTime(): number;
  getDuration(): number;
  setVolume(volume: number): void;
  mute(): void;
  unMute(): void;
  /** 公式の資料には無い。'captions' で字幕を外す */
  unloadModule(name: string): void;
  destroy(): void;
};
type YTNamespace = {
  Player: new (
    el: HTMLElement,
    options: {
      videoId?: string;
      playerVars?: Record<string, number>;
      events?: {
        onReady?: (e: { target: YTPlayer }) => void;
        onStateChange?: (e: { data: number }) => void;
        /** 再生できない動画（削除・非公開・埋め込み不可・有料会員限定など）。data はエラーの番号 */
        onError?: (e: { data: number }) => void;
        /** 押す操作の無い再生をブラウザに止められた */
        onAutoplayBlocked?: () => void;
      };
    },
  ) => YTPlayer;
  PlayerState: { ENDED: number; PLAYING: number; PAUSED: number };
};
declare global {
  interface Window {
    YT?: YTNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let apiReady: Promise<YTNamespace> | undefined;
function loadYouTubeApi(): Promise<YTNamespace> {
  apiReady ??= new Promise((resolve) => {
    if (window.YT?.Player) return resolve(window.YT);
    window.onYouTubeIframeAPIReady = () => {
      if (window.YT) resolve(window.YT);
    };
    const script = document.createElement('script');
    script.src = 'https://www.youtube.com/iframe_api';
    document.head.append(script);
  });
  return apiReady;
}

/**
 * YouTube のプレイヤーを作る。仕組み（iframe_api）の読み込みや、プレイヤーの準備（onReady）を待つあいだに
 * 別の曲が選ばれたら、準備ができたときに最後に選ばれた曲を流す。
 * プレイヤーの操作（loadVideoById など）は onReady までは生えていないので、それまでは呼ばない。
 * 呼ぶと例外になり、帯は次の曲を出しているのに前の曲が鳴り続けた
 */
export function createYouTubeEngine(
  container: HTMLElement,
  videoId: string,
  sound: Sound,
  events: EngineEvents,
): Engine {
  // 準備のできたプレイヤー。準備を待つあいだは null
  let player: YTPlayer | null = null;
  let latest = videoId;
  // 準備を待つあいだに一時停止を押されたら、準備ができても流さない。動画を入れずに作ったときも流さない
  let wantPlay = videoId !== '';
  let destroyed = false;

  void loadYouTubeApi().then((YT) => {
    if (destroyed) return;
    const el = document.createElement('div');
    container.replaceChildren(el);
    const first = latest;
    new YT.Player(el, {
      // 動画を入れずに作ると、空のプレイヤーになる（iPad・iPhone で、押す前に用意しておくとき）
      ...(first ? { videoId: first } : {}),
      // 表示はなるべく減らす。操作は Vocafy の帯でするので、YouTube の操作バーは出さない。
      // 上部の題名と「YouTube で見る」のロゴは、パラメータでは消せない（消そうとして上に重ねるのは規約違反）
      playerVars: {
        autoplay: 1,
        playsinline: 1,
        rel: 0, // 一時停止中の関連動画を、同じチャンネルのものに絞る
        controls: 0,
        iv_load_policy: 3, // 動画の注釈を出さない
        disablekb: 1, // プレイヤー内のキー操作で帯の表示とずれないようにする
      },
      events: {
        onReady: (e) => {
          if (destroyed) return;
          player = e.target;
          // 残しておいた音量で始める
          player.setVolume(sound.volume);
          if (sound.muted) player.mute();
          // 待つあいだに別の曲が選ばれていたら、その曲に替える（替えると流れ始める）
          if (latest !== first) player.loadVideoById(latest);
          else if (wantPlay) player.playVideo();
          else if (first) player.pauseVideo();
        },
        onStateChange: ({ data }) => {
          if (data === YT.PlayerState.PLAYING) {
            // 字幕は出さない。止めるパラメータは無く（cc_load_policy は出す側の 1 しか無い）、資料に無い unloadModule で外す。
            // 字幕の仕組みは流し始めてから読み込まれ、onApiChange の時点で外しても出た。流れ始めるたびに外す
            player?.unloadModule('captions');
            events.onPlaying();
          }
          if (data === YT.PlayerState.PAUSED) events.onPaused();
          if (data === YT.PlayerState.ENDED) events.onEnded();
        },
        // 押す操作の無い再生をブラウザに止められた（iPad の Safari で、プレイヤーを作って最初の曲など）。
        // 状態は未開始のまま何も届かない。ボタンから playVideo を送れば流れる
        onAutoplayBlocked: () => events.onBlocked(),
        // 再生できない動画（削除・非公開・埋め込み不可・有料会員限定など）。消えた・非公開（100）と
        // 埋め込み不可（101・150）は、台帳から外せるよう Vocafy に知らせる。ほかの番号は一時的な失敗のことがあるので知らせない
        onError: ({ data }) => {
          if ([100, 101, 150].includes(data)) reportUnplayable('youtube', latest);
          events.onError();
        },
      },
    });
  });

  return {
    service: 'youtube',
    load: (id) => {
      latest = id;
      wantPlay = true;
      // 前の動画を止めてから次の動画を頼む。止めずに頼むと、次の動画が届くまで前の動画が鳴り続け、
      // 曲を替えた直後に前の曲の音が一瞬聞こえた。止めても知らせ（onStateChange）は一時停止にならない
      player?.stopVideo();
      player?.loadVideoById(id);
    },
    play: () => {
      wantPlay = true;
      player?.playVideo();
    },
    pause: () => {
      wantPlay = false;
      player?.pauseVideo();
    },
    seek: (seconds) => player?.seekTo(seconds, true),
    setVolume: (volume) => {
      sound = { ...sound, volume };
      player?.setVolume(volume);
    },
    setMuted: (muted) => {
      sound = { ...sound, muted };
      if (muted) player?.mute();
      else player?.unMute();
    },
    time: () => ({
      current: player?.getCurrentTime() ?? 0,
      duration: player?.getDuration() ?? 0,
    }),
    destroy: () => {
      destroyed = true;
      // 準備を待つあいだのプレイヤーは destroy も持たないので、枠ごと外すだけにする
      player?.destroy();
      player = null;
      container.replaceChildren();
    },
  };
}
