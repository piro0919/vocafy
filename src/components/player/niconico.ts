import { createNiconicoEngine as createEmbedPlayer, type Preloaded } from 'niconico-embed-player';
import type { Engine, EngineEvents, Sound } from './engine';
import { niconicoFrameTitle } from './niconico-pool';
import { reportUnplayable } from './report';

/**
 * ニコニコの埋め込みプレイヤー（embed.nicovideo.jp）を、Vocafy のプレイヤーの形（engine.ts）で動かす。
 * 埋め込みとのやりとりは、ここから切り出したパッケージ niconico-embed-player に任せる（2026-10-16）。
 * 公式の資料の無い作法と、実物で確かめた動き（止められたことの見分け方・動画を替えるときに iframe を作り直すことなど）の
 * 説明もパッケージの側にある。こちらに残すのは Vocafy の決めごとだけ。
 *
 * - コメントは隠す。見た目を YouTube の曲とそろえるため（2026-10-08 に本人が決めた）
 * - 埋め込みの読み上げの名前は、いまの住所の言語で付ける
 * - 流せなかった動画は、台帳から外せるよう Vocafy に知らせる（report.ts）
 */
export function createNiconicoEngine(
  container: HTMLElement,
  firstVideoId: string,
  sound: Sound,
  events: EngineEvents,
  /** 先に読み込んでおいた埋め込み（niconico-pool.ts）。あればそれを使い、押した操作の中ですぐ流し始める */
  preloaded?: Preloaded,
  /**
   * 流し始める位置（秒）。開き直して前の曲の続きから流すとき。埋め込みの住所の from で渡す（先に読み込んでおいた埋め込みは、
   * 先読みのときに付けてある）。流れ始めてからシークすると、iPhone の Safari では止められた（2026-10-13）
   */
  startAt?: number,
): Engine {
  /** いま読み込んでいる動画。流せなかったときに知らせる */
  let videoId = firstVideoId;
  const player = createEmbedPlayer(
    container,
    {
      videoId: firstVideoId,
      startAt,
      volume: sound.volume,
      muted: sound.muted,
      hideComments: true,
      title: niconicoFrameTitle(),
      preloaded,
    },
    {
      onPlaying: events.onPlaying,
      onPaused: events.onPaused,
      onEnded: events.onEnded,
      onBlocked: events.onBlocked,
      // 流せない動画かは API が確かめ直すまで分からないので、どれも知らせる（watch.ts。中身ごとにまとまる）
      onError: (code) => {
        reportUnplayable('niconico', videoId);
        events.onError({ detail: code, unplayable: false });
      },
    },
  );

  return {
    service: 'niconico',
    load: (id, from) => {
      videoId = id;
      player.load(id, from);
    },
    play: player.play,
    pause: player.pause,
    seek: player.seek,
    setVolume: player.setVolume,
    setMuted: player.setMuted,
    time: player.time,
    destroy: player.destroy,
  };
}
