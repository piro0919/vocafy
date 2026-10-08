// YouTube の IFrame API のうち、使う分だけの型と読み込み
export type YTPlayer = {
  loadVideoById(id: string): void;
  playVideo(): void;
  pauseVideo(): void;
  seekTo(seconds: number, allowSeekAhead: boolean): void;
  getCurrentTime(): number;
  getDuration(): number;
  setVolume(volume: number): void;
  mute(): void;
  unMute(): void;
  destroy(): void;
};
export type YTNamespace = {
  Player: new (
    el: HTMLElement,
    options: {
      videoId: string;
      playerVars?: Record<string, number>;
      events?: {
        onReady?: (e: { target: YTPlayer }) => void;
        onStateChange?: (e: { data: number }) => void;
        /** 再生できない動画（削除・非公開・埋め込み不可・有料会員限定など）。data はエラーの番号 */
        onError?: (e: { data: number }) => void;
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
export function loadYouTubeApi(): Promise<YTNamespace> {
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
