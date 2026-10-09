'use client';

import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
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
import { Icon } from '@/components/icon';
import { SongItem } from '@/components/song-list';
import type { QueueItem } from '@/lib/catalog';
import { moveFavoriteSong } from '@/lib/favorites';

/**
 * お気に入りの曲の一覧。各行の右端の取っ手をつかんで、好きな順に並べ替えられる。
 * 行そのものは押すと流れるので、つかめるのは取っ手だけにする（スマホでは行をなぞると画面が流れるため）。
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
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const titleOf = (id: string | number) => songs.find((s) => s.songId === id)?.title ?? '';
  const placeOf = (id: string | number) => songs.findIndex((s) => s.songId === id) + 1;
  const announcements: Announcements = {
    onDragStart: ({ active }) =>
      `${titleOf(active.id)}をつかみました。いまは${placeOf(active.id)}番目です`,
    onDragOver: ({ active, over }) =>
      over ? `${titleOf(active.id)}を${placeOf(over.id)}番目へ` : undefined,
    onDragEnd: ({ active, over }) =>
      over
        ? `${titleOf(active.id)}を${placeOf(over.id)}番目に置きました`
        : `${titleOf(active.id)}を元の位置に戻しました`,
    onDragCancel: ({ active }) => `${titleOf(active.id)}を元の位置に戻しました`,
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
          draggable:
            '並べ替えるには、Space か Enter でつかみ、上下の矢印で動かして、もう一度 Space か Enter で置きます。Escape でやめます',
        },
      }}
      onDragEnd={onDragEnd}
    >
      <SortableContext items={songs.map((s) => s.songId)} strategy={verticalListSortingStrategy}>
        <div className="grid gap-1">
          {songs.map((song, i) => (
            <SortableSong key={song.songId} song={song} eager={i < 8} onOpen={() => onOpen(i)} />
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
  } = useSortable({ id: song.songId });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      // つかんでいる行は、ほかの行の上に浮かせる
      className={isDragging ? 'relative z-10 rounded-md bg-background shadow-lg' : undefined}
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
            {...listeners}
            aria-label={`${song.title}を並べ替える`}
            className={`grid size-9 shrink-0 touch-none place-items-center rounded-full text-muted transition-colors duration-150 hover:bg-foreground/8 hover:text-foreground ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
          >
            <Icon name="grip" className="size-5" />
          </button>
        }
      />
    </div>
  );
}
