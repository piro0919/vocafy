import type { QueueItem } from './catalog';

/**
 * localStorage に残した値の形の確かめ。確かめるのは流すのに要る項目だけにする。厳しくすると、項目が足される前に残した
 * お気に入りまで落としてしまう（表紙や名前が欠けていても、お気に入りの画面を開いたときに引き直す）
 */
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

/** 曲の id・流す先・動画の ID があるか */
export function isStoredSong(value: unknown): value is QueueItem {
  return (
    isRecord(value) &&
    typeof value.songId === 'number' &&
    (value.service === 'youtube' || value.service === 'niconico') &&
    typeof value.videoId === 'string'
  );
}

/** ボカロPの id と名前があるか */
export function isStoredProducer(
  value: unknown,
): value is { id: number; name: string; picture: string | null } {
  return isRecord(value) && typeof value.id === 'number' && typeof value.name === 'string';
}
