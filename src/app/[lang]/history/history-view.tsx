'use client';

import { PILL } from '@/components/button-styles';
import { SongList } from '@/components/song-list';
import { formatCount } from '@/lib/format';
import { toast } from 'sonner';
import { clearHistory, restoreHistory, useHistory } from '@/lib/history';
import { TIMING } from '@/lib/timing';
import { useText } from '@/i18n/navigation';
import { defineText } from '@/i18n/text';
import { TERMS } from '@/i18n/terms';

const TEXT = defineText({
  ja: {
    empty: '履歴はまだありません。聴いた曲がここに並びます。',
    clear: '履歴を削除',
    cleared: '履歴を削除しました',
    undo: '元に戻す',
  },
  en: {
    empty: 'No history yet. Songs you play will show up here.',
    clear: 'Clear history',
    cleared: 'History cleared',
    undo: 'Undo',
  },
});

/**
 * 最近聴いた曲を新しい順に全部（残すのは100曲まで）。押すと、ほかの一覧と同じくその曲のボカロPの画面へ移って流す。
 * 「履歴を削除」は確かめずにすぐ消し、知らせの「元に戻す」で戻せるようにする。ブラウザの確認の窓は見た目がサイトから浮いていた
 */
export function HistoryView() {
  const history = useHistory();
  const t = useText(TEXT);
  const terms = useText(TERMS);

  if (history.length === 0) {
    return <p className="text-sm text-muted">{t.empty}</p>;
  }

  return (
    <>
      <div className="mb-3 flex items-center gap-3">
        <span className="text-sm text-muted">{terms.songs(formatCount(history.length))}</span>
        <button
          type="button"
          onClick={() => {
            const removed = history;
            clearHistory();
            // 押せる知らせなので、ほかの知らせ（2秒）より長く出す
            toast(t.cleared, {
              duration: TIMING.undoToast,
              action: { label: t.undo, onClick: () => restoreHistory(removed) },
            });
          }}
          className={`${PILL} ml-auto`}
        >
          {t.clear}
        </button>
      </div>
      <SongList songs={history} className="grid gap-1 md:grid-cols-2 xl:grid-cols-3" />
    </>
  );
}
