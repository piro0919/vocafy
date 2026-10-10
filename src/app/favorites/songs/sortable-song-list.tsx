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
  } = useSortable({
    id: song.songId,
    // 並びが動く速さと曲線をほかの動きにそろえる（dnd-kit の既定は 250ms の ease）
    transition: { duration: MOTION.move, easing: EASE_OUT },
  });
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
            aria-label={`${song.title}を並べ替える`}
            className={`grid ${ICON_SM} touch-none text-muted hover:text-foreground ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
          >
            <Icon name="grip" className="size-5" />
          </button>
        }
      />
    </div>
  );
}
