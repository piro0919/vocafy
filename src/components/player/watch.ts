import type { QueueItem } from '@/lib/catalog';
import { isAppleDevice } from '@/lib/apple-device';
import { TIMING } from '@/lib/timing';

/**
 * 押したのに鳴らなかったことを Sentry に知らせる（2026-10-14）。たまにしか起きず、手元で再現させるのが手間なので、
 * 起きたときの記録を自動で集める。拾うのは2つ
 * - プレイヤーが知らせてきた失敗: 自分で押した曲がブラウザに止められた（blocked）、動画そのもの以外の理由で流せなかった（error）
 * - 押し直し: 鳴る前に、同じ曲をもう一度押した（retap）。知らせが何も届かず固まった場合は、これでしか分からない
 * 直前のプレイヤーの知らせは、Sentry の記録（breadcrumb）として一緒に届く
 */

type Service = QueueItem['service'];
type Failure = 'blocked' | 'error' | 'retap';

/** プレイヤーの知らせを、失敗の知らせに添える記録として残す */
export function trail(message: string, data?: Record<string, unknown>): void {
  window.Sentry?.addBreadcrumb({ category: 'player', message, data });
}

function report(kind: Failure, service: Service, videoId: string, detail?: string): void {
  window.Sentry?.captureMessage(`Playback failed: ${kind}`, {
    level: 'warning',
    tags: { playback: kind, service, apple: isAppleDevice() },
    contexts: { song: { service, videoId, detail } },
    // 曲ごとに分けず、失敗の種類と動画の出どころ（と error の中身）でまとめる
    fingerprint: ['playback', kind, service, detail ?? ''],
  });
}

/**
 * 自分で押した曲が鳴るまでを見張る。押した曲・押した時刻・まだ鳴っていないかを持ち、
 * 鳴る前に同じ曲が押し直されたら知らせる。1曲につき1回まで
 */
export function createTapWatch(now: () => number = () => performance.now()) {
  let last: { service: Service; videoId: string; at: number; sounded: boolean } | null = null;
  let reported = false;
  return {
    /** 曲を流そうとした。auto は自動で次へ進んだとき */
    requested(service: Service, videoId: string, auto: boolean): void {
      trail('load', { service, videoId, auto });
      if (auto) {
        last = null;
        return;
      }
      if (last && last.videoId === videoId) {
        if (!last.sounded && !reported && now() - last.at < TIMING.retapWindow) {
          reported = true;
          report('retap', service, videoId);
        }
        return;
      }
      last = { service, videoId, at: now(), sounded: false };
      reported = false;
    },
    /** 帯の ▶ で、止まっている曲を流そうとした。押した曲がまだ鳴っていなければ押し直しとみなす */
    retried(): void {
      trail('play');
      if (!last) return;
      this.requested(last.service, last.videoId, false);
    },
    sounded(): void {
      if (last) last.sounded = true;
    },
    /** 自分で押した曲がブラウザに止められた。自動で進んだ先の曲が止められるのは承知の上なので知らせない */
    blocked(service: Service, videoId: string, auto: boolean): void {
      trail('blocked', { auto });
      if (auto) return;
      // 止められたあとに ▶ を押し直すのは当たり前の操作なので、押し直しとしては数えない
      if (last?.videoId === videoId) reported = true;
      report('blocked', service, videoId);
    },
    /** 流せなかった。動画そのものが流せないとき（消えた・埋め込み不可）は台帳から外す側（report.ts）に任せ、ここでは知らせない */
    failed(service: Service, videoId: string, detail: string, unplayable: boolean): void {
      trail('error', { detail });
      if (!unplayable) report('error', service, videoId, detail);
    },
  };
}
