import type { QueueItem } from '@/lib/catalog';

type Service = QueueItem['service'];

/**
 * 流せない動画を Vocafy の API に知らせる（src/app/api/unplayable/route.ts）。API が確かめ直して、本当に流せなければ
 * 台帳から外す。知らせが届かなくても再生は困らない（プレイヤーはもう次の曲へ進んでいる）ので、結果は待たない
 */
export function reportUnplayable(service: Service, videoId: string): void {
  void fetch('/api/unplayable', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ service, videoId }),
    // ページを移っても送りきる
    keepalive: true,
  }).catch(() => {});
}
