'use client';

import { type RefObject, useCallback, useRef } from 'react';
import { SongItem } from '../song-list';
import { FloatingPanel } from './floating-panel';
import { usePlayer } from './player-provider';

/**
 * 次に流れる曲（順番待ち）。流す順（ランダムなら混ぜたあとの順）で並べ、押すとその曲へ飛ぶ。
 * 外枠（開閉・置き場所）は floating-panel.tsx。板の中のスクロールは後ろのページに伝えない
 */
export function QueuePanel({
  open,
  onClose,
  trigger,
}: {
  open: boolean;
  onClose: () => void;
  trigger: RefObject<HTMLButtonElement | null>;
}) {
  const { current, upcoming, jumpTo, skipsNiconico } = usePlayer();
  // 閉じているあいだは並びを作らない（曲が変わるたびに組み直さない）
  const items = open ? upcoming() : [];
  const list = useRef<HTMLDivElement>(null);
  // 開いたら、並びの先頭から見せる
  const toTop = useCallback(() => list.current?.scrollTo({ top: 0 }), []);
  return (
    <FloatingPanel
      open={open}
      onClose={onClose}
      trigger={trigger}
      title="次に流れる曲"
      onOpened={toTop}
    >
      {current && (
        <div className="px-2">
          <SongItem song={current} onOpen={onClose} favorite={false} />
        </div>
      )}
      <div ref={list} className="mt-2 min-h-0 flex-1 overscroll-contain overflow-y-auto px-2 pb-2">
        {/* 自動で進むと飛ばす曲（iPad の Safari のニコニコの曲）は、流れる順番に入らないので並べない */}
        {items
          .filter(({ item }) => !(skipsNiconico && item.service === 'niconico'))
          .map(({ item, index }) => (
            <SongItem
              key={`${index}-${item.songId}`}
              song={item}
              favorite={false}
              onOpen={() => jumpTo(index)}
            />
          ))}
      </div>
    </FloatingPanel>
  );
}
