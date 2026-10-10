import { type RefObject, useEffect } from 'react';
import { usePlayer } from './player-provider';

/**
 * ニコニコの曲の行が見えているあいだ、埋め込みを先に読み込んでおく（iPad・iPhone だけ。niconico-pool.ts）。
 * ref の要素とその中の、data-preload に動画の ID を持つ要素を見張る。key が変わったら（一覧の中身が替わったら）見張り直す
 */
export function usePreload(ref: RefObject<HTMLElement | null>, key: unknown) {
  const { preload } = usePlayer();
  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const targets = [root, ...root.querySelectorAll<HTMLElement>('[data-preload]')].filter(
      (el) => el.dataset.preload,
    );
    if (targets.length === 0) return;
    const releases = new Map<Element, () => void>();
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        const id = (entry.target as HTMLElement).dataset.preload;
        if (!id) continue;
        if (entry.isIntersecting) {
          if (!releases.has(entry.target)) releases.set(entry.target, preload(id));
        } else {
          releases.get(entry.target)?.();
          releases.delete(entry.target);
        }
      }
    });
    for (const target of targets) observer.observe(target);
    return () => {
      observer.disconnect();
      for (const release of releases.values()) release();
    };
  }, [ref, key, preload]);
}
