'use client';

import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
} from '@dnd-kit/core';
import { restrictToParentElement, restrictToVerticalAxis } from '@dnd-kit/modifiers';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { SyntheticEvent } from 'react';
import { EASE_OUT, MOTION } from '@/lib/motion';
import { Icon } from '@/components/icon';
import { SongItem } from '@/components/song-list';
import type { QueueItem } from '@/lib/catalog';
import { moveFavoriteSong } from '@/lib/favorites';
import { ICON_SM } from '@/components/button-styles';
import { EAGER_IMAGES } from '@/lib/image-sizes';
import { useText } from '@/i18n/navigation';
import { defineText } from '@/i18n/text';

const TEXT = defineText({
  ja: {
    picked: (title: string, place: number) => `${title}をつかみました。いまは${place}番目です`,
    moving: (title: string, place: number) => `${title}を${place}番目へ`,
    dropped: (title: string, place: number) => `${title}を${place}番目に置きました`,
    restored: (title: string) => `${title}を元の位置に戻しました`,
    instructions:
      '並べ替えるには、Space か Enter でつかみ、上下の矢印で動かして、もう一度 Space か Enter で置きます。Escape でやめます',
    reorder: (title: string) => `${title}を並べ替える`,
  },
  en: {
    picked: (title: string, place: number) => `Picked up ${title}. It is at position ${place}`,
    moving: (title: string, place: number) => `${title} moved to position ${place}`,
    dropped: (title: string, place: number) => `${title} dropped at position ${place}`,
    restored: (title: string) => `${title} returned to its original position`,
    instructions:
      'To reorder, press Space or Enter to pick up, use the up and down arrows to move, then press Space or Enter again to drop. Press Escape to cancel',
    reorder: (title: string) => `Reorder ${title}`,
  },
});

/**
 * お気に入りの曲の一覧。好きな順に並べ替えられる。
 * パソコンは行のどこでも、押したまま動かすとつかめる（押してすぐ離せば流れる。Spotify のパソコン版と同じ）。
 * スマホは各行の右端の取っ手だけ。行をなぞると画面が流れ、長押しでつかむ形は見ても分からないうえ、
 * iPhone の長押しの文字選択ともぶつかるため。
 * キーボードでは、取っ手で Space を押してから上下の矢印で動かし、もう一度 Space で置く
 */
export function SortableSongList({
  songs,
  onOpen,
}: {
  songs: QueueItem[];
  onOpen: (index: number) => void;
}) {
  const sensors = useSensors(
    // 少し動かしてからつかむ。押しただけで並べ替えが始まらないように
    useSensor(MouseSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const t = useText(TEXT);
  const titleOf = (id: string | number) => songs.find((s) => s.songId === id)?.title ?? '';
  const placeOf = (id: string | number) => songs.findIndex((s) => s.songId === id) + 1;
  const announcements: Announcements = {
    onDragStart: ({ active }) => t.picked(titleOf(active.id), placeOf(active.id)),
    onDragOver: ({ active, over }) =>
      over ? t.moving(titleOf(active.id), placeOf(over.id)) : undefined,
    onDragEnd: ({ active, over }) =>
      over ? t.dropped(titleOf(active.id), placeOf(over.id)) : t.restored(titleOf(active.id)),
    onDragCancel: ({ active }) => t.restored(titleOf(active.id)),
  };
  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (over && active.id !== over.id) moveFavoriteSong(Number(active.id), Number(over.id));
  };

  return (
    <DndContext
      // サーバーで作る id とブラウザで作る id がずれないよう、名前を決めておく
      id="favorite-songs"
      sensors={sensors}
      collisionDetection={closestCenter}
      modifiers={[restrictToVerticalAxis, restrictToParentElement]}
      accessibility={{
        announcements,
        screenReaderInstructions: {
          draggable: t.instructions,
        },
      }}
      onDragEnd={onDragEnd}
    >
      <SortableContext items={songs.map((s) => s.songId)} strategy={verticalListSortingStrategy}>
        <div className="grid gap-1">
          {songs.map((song, i) => (
            <SortableSong
              key={song.songId}
              song={song}
              eager={i < EAGER_IMAGES}
              onOpen={() => onOpen(i)}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}

function SortableSong({
  song,
  eager,
  onOpen,
}: {
  song: QueueItem;
  eager: boolean;
  onOpen: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: song.songId,
    // 並びが動く速さと曲線をほかの動きにそろえる（dnd-kit の既定は 250ms の ease）
    transition: { duration: MOTION.move, easing: EASE_OUT },
  });
  const t = useText(TEXT);
  // dnd-kit は受け口を Function の表で返すので、置き場所ごとに1つずつ取り出す
  const on = (name: 'onMouseDown' | 'onTouchStart' | 'onKeyDown') =>
    listeners?.[name] as ((event: SyntheticEvent) => void) | undefined;
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      // マウスは行のどこからでもつかむ。指は取っ手だけ（下の handle）
      onMouseDown={on('onMouseDown')}
      // 表紙の画像をブラウザが自前で引きずらないように
      onDragStart={(e) => e.preventDefault()}
      // つかんでいる行は、ほかの行の上に浮かせる
      // min-w-0: 格子の中の行は、既定では中の文字の長さより縮まない。長い曲名や歌声で画面の外まで広がった
      className={`min-w-0 select-none ${isDragging ? 'relative z-raised rounded-md bg-background shadow-lift' : ''}`}
    >
      <SongItem
        song={song}
        eager={eager}
        onOpen={onOpen}
        handle={
          <button
            ref={setActivatorNodeRef}
            type="button"
            {...attributes}
            onTouchStart={on('onTouchStart')}
            onKeyDown={on('onKeyDown')}
            aria-label={t.reorder(song.title)}
            className={`grid ${ICON_SM} touch-none text-muted hover:text-foreground ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
          >
            <Icon name="grip" className="size-5" />
          </button>
        }
      />
    </div>
  );
}
