import type { QueueItem } from '@/lib/catalog';
import { Icon } from '../icon';

/** 元の動画の住所（YouTube かニコニコの動画のページ） */
function originalUrl(song: QueueItem): string {
  return song.service === 'niconico'
    ? `https://www.nicovideo.jp/watch/${song.videoId}`
    : `https://www.youtube.com/watch?v=${song.videoId}`;
}

/**
 * 元の動画を新しいタブで開くボタン。作者の動画のページで、再生数やコメント、作者のほかの活動につながる。
 * 流している曲の横（パソコンは下の帯、スマホは次に流れる曲の板）に置く
 */
export function OriginalLink({ song, className = '' }: { song: QueueItem; className?: string }) {
  const label = song.service === 'niconico' ? 'ニコニコで開く' : 'YouTube で開く';
  return (
    <a
      href={originalUrl(song)}
      target="_blank"
      rel="noopener"
      aria-label={`「${song.title}」を${label}`}
      title={label}
      className={`grid size-9 shrink-0 place-items-center rounded-full text-muted transition-[color,scale] duration-150 ease-out hover:bg-foreground/8 hover:text-foreground active:scale-90 ${className}`}
    >
      <Icon name={song.service} className="size-5" />
    </a>
  );
}
