import type { QueueItem } from '@/lib/catalog';
import { MoreLink } from './browse-cards';
import { YEAR_HEADING } from './heading';
import { SongList } from './song-list';

export type PickGroup = {
  key: string;
  label: string;
  songs: QueueItem[];
  /** 代表曲に入りきらない区切りだけ、その区切りの全曲の住所。入りきっていれば null */
  more: string | null;
};

/**
 * 代表曲を区切りごとに並べる（年の画面は月ごと、歌声の画面は年ごと）。区切りの見出しの横に、代表曲に入りきらない区切りだけ
 * 「すべて表示」を出す
 */
export function PickGroups({ groups }: { groups: PickGroup[] }) {
  return (
    <div className="grid gap-6">
      {groups.map((g) => (
        <section key={g.key}>
          <div className="mb-2 flex items-center gap-3">
            <h2 className={YEAR_HEADING}>{g.label}</h2>
            {g.more && (
              <div className="ml-auto">
                <MoreLink href={g.more} />
              </div>
            )}
          </div>
          <SongList songs={g.songs} className="grid gap-1 md:grid-cols-2 xl:grid-cols-3" />
        </section>
      ))}
    </div>
  );
}
