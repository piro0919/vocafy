import type { QueueItem } from '@/lib/catalog';

/**
 * 動画を流す仕組み（YouTube かニコニコ）を、同じ操作で動かすための形。
 * PlayerProvider は流す曲の service を見てどちらかを作り、曲が変わっても service が同じなら使い回す
 */
export type Engine = {
  service: QueueItem['service'];
  /** 別の動画に切り替えて、頭から流す */
  load(videoId: string): void;
  play(): void;
  pause(): void;
  /** 秒 */
  seek(seconds: number): void;
  /** 0〜100 */
  setVolume(volume: number): void;
  setMuted(muted: boolean): void;
  /** いまの再生位置と長さ（秒）。まだ分からなければ 0 */
  time(): { current: number; duration: number };
  destroy(): void;
};

export type EngineEvents = {
  onPlaying(): void;
  onPaused(): void;
  onEnded(): void;
  /** 押す操作の無い再生をブラウザに止められた（iPad の Safari など）。止まったまま次の操作を待っている */
  onBlocked(): void;
  /** 流せない動画（削除・非公開・埋め込み不可など） */
  onError(): void;
};

/** 作るときに渡す、残しておいた音量 */
export type Sound = { volume: number; muted: boolean };
