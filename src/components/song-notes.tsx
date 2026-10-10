'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { QueueItem } from '@/lib/catalog';
import { FADE, HIDDEN } from './player/dock-strip';
import { Icon } from './icon';
import { ICON } from './button-styles';

/**
 * 流している曲の動画の説明文。パソコンのボカロPの画面の、動画の列の下に出す。
 * 全文を出し、列が画面からはみ出さないよう、高さを切って中でスクロールする。
 * 連続再生で曲が替わっても枠は出したままにし、中の文字だけを入れ替える（枠ごと出し入れすると、曲ごとに出たり消えたりしてうるさかった）。
 * 枠を出し入れする動きは右下の窓と同じ。
 * パソコンより狭い幅では、動画の下に枠を置かず、「再生」の段と動画の下の帯の説明文のボタン（producer-player.tsx）から、動画の下に全文の板を開く。
 * 段の下に頭の2行を出す形（YouTube のアプリと同じ）も試したが、「再生」の段のすぐ下に出るのがいまひとつだった
 */
export function SongNotes({
  song,
  open,
  setOpen,
  onAvailable,
}: {
  song: QueueItem | null;
  /** 狭い幅で、全文の板を開いているか。動画の下の帯のボタンからも開くので、持ち主（producer-player.tsx）が持つ */
  open: boolean;
  setOpen: (open: boolean) => void;
  /** 説明文を出しているかを知らせる。出していないあいだは、帯のボタンを出さない */
  onAvailable: (available: boolean) => void;
}) {
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

  // 届いている説明文のうち、いまの曲のもの。空なら出さない。loaded は、いまの曲の答えが届いたか（空でも）
  const target = key && notes?.key === key && notes.text ? notes : null;
  const targetKey = target?.key;
  const loaded = !key || notes?.key === key;
  const targetRef = useRef(target);
  useEffect(() => {
    targetRef.current = target;
  }, [target]);
  // 描いている説明文と、枠が見えているか・文字が見えているか
  const [current, setCurrent] = useState<{ key: string; text: string } | null>(null);
  const [boxOn, setBoxOn] = useState(false);
  const [textOn, setTextOn] = useState(false);
  const text = useRef<HTMLDivElement>(null);
  const sheetBody = useRef<HTMLDivElement>(null);

  // 曲が替わったら、枠は出したまま文字だけを消し、次の説明文が届いたら差し替える。
  // 次の曲に説明文が無いときと、流すのをやめたときだけ、枠ごと消して外す
  useEffect(() => {
    if (current?.key === targetKey) return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const later = (f: () => void, ms = 0) => timers.push(setTimeout(f, ms));
    if (!current) {
      later(() => setCurrent(targetRef.current));
    } else {
      later(() => setTextOn(false));
      if (targetKey)
        later(() => {
          setCurrent(targetRef.current);
          text.current?.scrollTo({ top: 0 });
          sheetBody.current?.scrollTo({ top: 0 });
        }, FADE_MS);
      else if (loaded) {
        later(() => setBoxOn(false));
        later(() => {
          setCurrent(null);
          setOpen(false);
        }, FADE_MS);
      }
    }
    return () => timers.forEach(clearTimeout);
  }, [current, targetKey, loaded, setOpen]);

  // 描いたら、透明の状態を一度描いてから浮かび上がらせる
  useEffect(() => {
    if (!current) return;
    const frame = requestAnimationFrame(() => {
      setBoxOn(true);
      setTextOn(true);
    });
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
      // 列は一覧の入れ物の下の端より下へは行けず、枠が長いと列ごと上へ押し上げられて、動画が上の段に潜った。
      // 一番下までスクロールしたときに一覧の入れ物の下に残るのは、本文の下の余白と、その下の足元の段（帯の分の余白を持つ。
      // site-footer.tsx）。位置の差では測らない。ページの高さで測ると、スクロールしない画面では画面の高さに引き上げられ、
      // 足元の段までの距離で測ると、本文が画面の高さまで引き伸ばされた分まで数えて、枠を隠した
      const main = grid.closest('main');
      const end = document.querySelector('.page-bottom');
      const below =
        (end?.getBoundingClientRect().height ?? 0) +
        (main ? parseFloat(getComputedStyle(main).paddingBottom) : 0);
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

  useEffect(() => {
    onAvailable(!!current);
  }, [current, onAvailable]);

  // 板を開いているあいだは Esc で閉じる
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, setOpen]);

  if (!current) return null;

  const body = (
    <div
      className={`transition-opacity duration-300 ease-(--ease-out) ${textOn ? '' : 'opacity-0'}`}
    >
      {linkify(current.text)}
    </div>
  );

  return (
    <>
      {createPortal(
        // 動画の下（スマホは動画が上に固定され、高さは幅の 9/16）から画面の下までを、ほかの浮いた板と同じく端から 12px 離した角丸の板で覆う。
        // 動画には重ねない（YouTube の規約）
        <div
          inert={!open}
          role="dialog"
          aria-label="説明文"
          className={`fixed inset-x-3 bottom-3 z-40 flex flex-col rounded-2xl border border-line/60 bg-glass shadow-lg shadow-black/5 backdrop-blur-lg backdrop-saturate-150 transition-[translate,visibility] duration-300 ease-(--ease-out) max-md:top-[calc(56.25vw+12px)] md:top-[30dvh] lg:hidden ${open ? '' : 'invisible translate-y-[calc(100%+24px)]'}`}
        >
          <div className="flex items-center justify-between py-1 pr-1 pl-4">
            <span className="font-bold">説明文</span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="閉じる"
              className={ICON}
            >
              <Icon name="close" />
            </button>
          </div>
          <div
            ref={sheetBody}
            className="flex-1 overflow-y-auto overscroll-contain px-4 pb-8 text-sm break-words whitespace-pre-line"
          >
            {body}
          </div>
        </div>,
        document.body,
      )}
      {/* 枠の上の間が外へはみ出さないよう flow-root にする。はみ出すと、外側の位置に間が含まれ、二重に数えて枠が短くなった */}
      <div ref={box} className="flow-root max-lg:hidden">
        {/* 入る高さが足りない画面では出さない。無理に出すと、列ごと押し上げられる */}
        {height !== undefined && height >= MIN_HEIGHT && (
          <div
            style={{ maxHeight: height }}
            ref={text}
            className={`mt-6 overflow-y-auto rounded-2xl border border-line/60 bg-glass p-4 text-sm break-words whitespace-pre-line ${FADE} ${boxOn ? '' : HIDDEN}`}
          >
            {body}
          </div>
        )}
      </div>
    </>
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
