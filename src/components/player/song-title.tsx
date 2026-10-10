'use client';

import { useEffect, useRef } from 'react';
import { usePlayer } from './player-provider';

/**
 * 曲を流しているあいだ、タブの題名を「曲名 - ボカロP | Vocafy」にする（Spotify の Web 版と同じ。2026-10-11）。
 * 止めたら、その画面の題名に戻す。Next.js は画面を移るたびに題名を書き換えるので、書き換えを見張り、
 * 流しているあいだは曲名に上書きし直す。画面には何も出さない
 */
export function SongTitle() {
  const { current, playing } = usePlayer();
  // その画面の題名（Next.js が付けたもの）と、こちらが付けた題名
  const page = useRef<string | null>(null);
  const ours = useRef<string | null>(null);
  const wanted = current && playing ? `${current.title} - ${current.producerName} | Vocafy` : null;
  const wantedRef = useRef(wanted);

  useEffect(() => {
    wantedRef.current = wanted;
    if (wanted) {
      if (ours.current === null) page.current = document.title;
      ours.current = wanted;
      document.title = wanted;
    } else if (ours.current !== null) {
      ours.current = null;
      if (page.current !== null) document.title = page.current;
    }
  }, [wanted]);

  // 画面を移って Next.js が題名を書き換えたら、それをその画面の題名として覚え、流しているなら曲名に戻す
  useEffect(() => {
    const observer = new MutationObserver(() => {
      if (document.title === ours.current) return;
      page.current = document.title;
      const next = wantedRef.current;
      if (next) {
        ours.current = next;
        document.title = next;
      }
    });
    observer.observe(document.head, { subtree: true, childList: true, characterData: true });
    return () => observer.disconnect();
  }, []);

  return null;
}
