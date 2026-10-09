/** 動画を置いている先 */
export type Service = 'youtube' | 'niconico';

/**
 * 動画の ID の形。形の合わないものは、外の窓口に問い合わせもしない（src/lib/unplayable.ts）。
 * DB にも外にも触らないので、テストから確かめられる
 */
export function isVideoId(service: Service, id: string): boolean {
  return service === 'youtube' ? /^[\w-]{11}$/.test(id) : /^(sm|so|nm)\d{1,10}$/.test(id);
}
