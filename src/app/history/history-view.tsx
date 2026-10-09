'use client';

import { PILL } from '@/components/browse-cards';
import { SongList } from '@/components/song-list';
import { formatCount } from '@/lib/format';
import { clearHistory, useHistory } from '@/lib/history';

/**
 * 最近聴いた曲を新しい順に全部（残すのは100曲まで）。押すと、ほかの一覧と同じくその曲のボカロPの画面へ移って流す
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
            if (window.confirm('最近聴いた曲の履歴を削除しますか？')) clearHistory();
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
