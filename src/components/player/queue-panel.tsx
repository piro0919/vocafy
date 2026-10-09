'use client';

import { useEffect } from 'react';
import { SongItem } from '../song-list';
import { usePlayer } from './player-provider';

/**
 * 次に流れる曲（順番待ち）。流す順（ランダムなら混ぜたあとの順）で並べ、押すとその曲へ飛ぶ。
 * パソコンは下の帯の右上、スマホは帯の上に、画面の幅いっぱいの板で出す（高さはトーストと同じ --toast-bottom の上）。
 * 板の外を押すか Esc で閉じる
 */
export function QueuePanel({ onClose }: { onClose: () => void }) {
  const { current, upcoming, jumpTo, context } = usePlayer();
  const items = upcoming();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <>
      {/* 板の外を押したら閉じる */}
      <div aria-hidden className="fixed inset-0 z-40" onClick={onClose} />
      <div
        role="dialog"
        aria-label="次に流れる曲"
        // パソコンで右下の窓で流しているとき（html の data-player が dock）は、動画の上に重ねない（YouTube の規約）よう、
        // 窓（幅 356px）の左に出す。スマホは開くボタンが動画の画面にしか無く、右下の窓のときには開けない
        className="fixed inset-x-3 bottom-(--toast-bottom) z-50 flex max-h-[60dvh] flex-col overflow-hidden rounded-2xl border border-line/60 bg-sidebar/95 shadow-2xl shadow-black/20 backdrop-blur-lg backdrop-saturate-150 md:right-3 md:left-auto md:w-96 md:[html[data-player=dock]_&]:right-[380px]"
      >
        <div className="flex items-baseline gap-2 px-4 pt-3 pb-2">
          <h2 className="font-display text-base">次に流れる曲</h2>
          {context === 'radio' && (
            <span className="text-xs text-muted">ラジオ（関連曲を足していく）</span>
          )}
        </div>
        {current && (
          <div className="px-2">
            <p className="px-2 pb-1 text-xs text-muted">再生中</p>
            <SongItem song={current} onOpen={onClose} />
          </div>
        )}
        <div className="mt-2 min-h-0 flex-1 overflow-y-auto px-2 pb-2">
          {items.length > 0 ? (
            items.map(({ item, index }) => (
              <SongItem key={`${index}-${item.songId}`} song={item} onOpen={() => jumpTo(index)} />
            ))
          ) : (
            <p className="px-2 py-3 text-sm text-muted">
              {context === 'radio' ? '関連曲を探しています…' : 'この曲で並びの最後です。'}
            </p>
          )}
        </div>
      </div>
    </>
  );
}
