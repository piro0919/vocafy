'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { QueueItem } from '@/lib/catalog';
import { FADE, HIDDEN } from './player/dock-strip';

/**
 * 流している曲の動画の説明文。パソコンのボカロPの画面の、動画の列の下に出す。
 * 全文を出し、列が画面からはみ出さないよう、高さを切って中でスクロールする。
 * 曲が替わったら、いまの説明文をフェードアウトしてから外し、次の説明文が届いたらフェードインする。動きは右下の窓の出入りと同じ
 */
export function SongNotes({ song }: { song: QueueItem | null }) {
  const key = song ? `${song.service}/${song.videoId}` : null;
  const [notes, setNotes] = useState<{ key: string; text: string } | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number>();

  useEffect(() => {
    if (!key) return;
    let alive = true;
    fetch(`/api/description/${key}`)
      .then((res) => (res.ok ? res.json() : { text: '' }))
      .then((data: { text: string }) => {
        if (!alive) return;
        setNotes({ key, text: data.text.trim() });
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [key]);

  // 届いている説明文のうち、いまの曲のもの。空なら出さない
  const target = key && notes?.key === key && notes.text ? notes : null;
  const targetRef = useRef(target);
  useEffect(() => {
    targetRef.current = target;
  }, [target]);
  // 描いている説明文と、見えているか（フェードの入・出）
  const [current, setCurrent] = useState<{ key: string; text: string } | null>(null);
  const [visible, setVisible] = useState(false);

  // 曲が替わったら、描いている説明文をフェードアウトしてから外す。何も描いていなければ、すぐに次を描く
  useEffect(() => {
    if (current?.key === target?.key) return;
    if (current) {
      let swap: ReturnType<typeof setTimeout> | undefined;
      const fade = setTimeout(() => {
        setVisible(false);
        swap = setTimeout(() => setCurrent(targetRef.current), FADE_MS);
      }, 0);
      return () => {
        clearTimeout(fade);
        clearTimeout(swap);
      };
    }
    const frame = requestAnimationFrame(() => setCurrent(targetRef.current));
    return () => cancelAnimationFrame(frame);
  }, [current, target?.key]);

  // 描いたら、透明の状態を一度描いてからフェードインする
  useEffect(() => {
    if (!current) return;
    const frame = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(frame);
  }, [current]);

  const shown = !!current;
  useLayoutEffect(() => {
    const el = box.current;
    const column = el?.parentElement;
    const grid = column?.parentElement;
    if (!shown || !el || !column || !grid) return;
    const measure = () => {
      // 列が貼り付いているときの、枠の上の位置。枠を隠しても測れるよう、いつも置いてある外側の入れ物で測る
      const stuck =
        parseFloat(getComputedStyle(column).top) +
        (el.getBoundingClientRect().top - column.getBoundingClientRect().top) +
        GAP;
      // 一番下までスクロールしたときに、一覧の入れ物より下に残る高さ。列は入れ物の下の端より下へは行けず、
      // 枠が長いと列ごと上へ押し上げられて、動画が上の段に潜った
      const below =
        document.documentElement.scrollHeight -
        (grid.getBoundingClientRect().bottom + window.scrollY);
      setHeight(window.innerHeight - stuck - Math.max(BOTTOM, below));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(document.body);
    window.addEventListener('resize', measure);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [shown]);

  if (!current) return null;

  return (
    // 枠の上の間が外へはみ出さないよう flow-root にする。はみ出すと、外側の位置に間が含まれ、二重に数えて枠が短くなった
    <div ref={box} className="flow-root max-lg:hidden">
      {/* 入る高さが足りない画面では出さない。無理に出すと、列ごと押し上げられる */}
      {height !== undefined && height >= MIN_HEIGHT && (
        <div
          style={{ maxHeight: height }}
          className={`mt-6 overflow-y-auto rounded-2xl border border-line/60 bg-glass p-4 text-sm break-words whitespace-pre-line ${FADE} ${visible ? '' : HIDDEN}`}
        >
          {linkify(current.text)}
        </div>
      )}
    </div>
  );
}

/** 下の再生の帯（下から 12px・高さ 64px）と、その上の余白 24px */
const BOTTOM = 100;
/** フェードの長さ（FADE の duration-300 と同じ） */
const FADE_MS = 300;
/** 枠の上の間（mt-6） */
const GAP = 24;
/** 枠に取れる高さがこれより低い画面では出さない（px） */
const MIN_HEIGHT = 120;

const URL_RE = /(https?:\/\/[^\s<>「」（）()]+)/g;

function linkify(text: string) {
  return text.split(URL_RE).map((part, i) =>
    i % 2 === 1 ? (
      <a
        key={i}
        href={part}
        target="_blank"
        rel="noopener noreferrer"
        className="text-accent underline-offset-2 hover:underline"
      >
        {part}
      </a>
    ) : (
      part
    ),
  );
}
