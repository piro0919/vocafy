'use client';

import { PILL } from '@/components/browse-cards';
import { SongList } from '@/components/song-list';
import { formatCount } from '@/lib/format';
import { toast } from 'sonner';
import { clearHistory, restoreHistory, useHistory } from '@/lib/history';

/**
 * 最近聴いた曲を新しい順に全部（残すのは100曲まで）。押すと、ほかの一覧と同じくその曲のボカロPの画面へ移って流す。
 * 「履歴を削除」は確かめずにすぐ消し、知らせの「元に戻す」で戻せるようにする。ブラウザの確認の窓は見た目がサイトから浮いていた
 */
export function HistoryView() {
  const history = useHistory();

  if (history.length === 0) {
    return <p className="text-sm text-muted">まだ曲を聴いていません。流した曲がここに残ります。</p>;
  }

  return (
    <>
      <div className="mb-3 flex items-center gap-3">
        <span className="text-sm text-muted">{formatCount(history.length)}曲</span>
        <button
          type="button"
          onClick={() => {
            const removed = history;
            clearHistory();
            // 押せる知らせなので、ほかの知らせ（2秒）より長く出す
            toast('履歴を削除しました', {
              duration: 5000,
              action: { label: '元に戻す', onClick: () => restoreHistory(removed) },
            });
          }}
          className={`${PILL} ml-auto`}
        >
          履歴を削除
        </button>
      </div>
      <SongList songs={history} className="grid gap-1 md:grid-cols-2 xl:grid-cols-3" />
    </>
  );
}
