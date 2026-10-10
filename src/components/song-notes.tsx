'use client';

import { type RefObject, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { MOTION } from '@/lib/motion';
import { createPortal } from 'react-dom';
import type { QueueItem } from '@/lib/catalog';
import { FADE, HIDDEN } from './player/dock-strip';
import { FloatingPanel } from './player/floating-panel';
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
function SongNotes({
  song,
  open,
  setOpen,
  trigger,
  onAvailable,
}: {
  song: QueueItem | null;
  /** 狭い幅で、全文の板を開いているか。動画の下の帯のボタンからも開くので、持ち主（producer-player.tsx）が持つ */
  open: boolean;
  setOpen: (open: boolean) => void;
  /** 板を開いたボタン。閉じたらここにフォーカスを戻す */
  trigger: RefObject<HTMLButtonElement | null>;
  /** 説明文を出しているかを知らせる。出していないあいだは、帯のボタンを出さない */
  onAvailable: (available: boolean) => void;
}) {
  const key = song ? `${song.service}/${song.videoId}` : null;
  const [notes, setNotes] = useState<{ key: string; text: string } | null>(null);
  // 前に取った説明文（ほかの画面で取ったものも）。届くのを待たずに出す
  const cached = key ? known.get(key) : undefined;
  const box = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number>();

  useEffect(() => {
    if (!key || known.has(key)) return;
    let alive = true;
    fetch(`/api/description/${key}`)
      .then((res) => (res.ok ? res.json() : { text: '' }))
      .then((data: { text: string }) => {
        known.set(key, data.text.trim());
        if (!alive) return;
        setNotes({ key, text: data.text.trim() });
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [key]);

  // 届いている説明文のうち、いまの曲のもの。空なら出さない。loaded は、いまの曲の答えが届いたか（空でも）
  const got =
    key && notes?.key === key ? notes : key && cached !== undefined ? { key, text: cached } : null;
  const target = got?.text ? got : null;
  const targetKey = target?.key;
  const loaded = !key || !!got;
  const targetRef = useRef(target);
  useEffect(() => {
    targetRef.current = target;
  }, [target]);
  // 描いている説明文と、枠が見えているか・文字が見えているか
  // 前に取った説明文のある曲で画面を開いたら（ラジオのボタンで画面を移ったときなど）、浮かび上がらせずに最初から出す。
  // 開いた画面ごとに作り直すので、そうしないと、移るたびに一瞬消えてからふわっと出た
  const [current, setCurrent] = useState(() => target);
  const [boxOn, setBoxOn] = useState(() => !!target);
  const [textOn, setTextOn] = useState(() => !!target);
  const text = useRef<HTMLDivElement>(null);
  const sheetBody = useRef<HTMLDivElement>(null);

  // 曲が替わったら、枠は出したまま文字だけを消し、次の説明文が届いたら差し替える。
  // 次の曲に説明文が無いときと、流すのをやめたときだけ、枠ごと消して外す
  useEffect(() => {
    if (current?.key === targetKey) return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const later = (f: () => void, ms = 0) => timers.push(setTimeout(f, ms));
    if (!current) {
      // 前に取った説明文なら、浮かび上がらせずにそのまま出す
      const instant = !!targetKey && known.has(targetKey);
      later(() => {
        setCurrent(targetRef.current);
        if (instant) {
          setBoxOn(true);
          setTextOn(true);
        }
      });
    } else {
      later(() => setTextOn(false));
      if (targetKey)
        later(() => {
          setCurrent(targetRef.current);
          text.current?.scrollTo({ top: 0 });
          sheetBody.current?.scrollTo({ top: 0 });
        }, MOTION.move);
      else if (loaded) {
        // 流すのをやめたとき（song が null）は、少し待ってから消す。ラジオのボタンなどで別の画面へ移るときは、移る前に
        // この画面が持ち主でなくなり、移るまでの一瞬だけ消えかけた。移り終えればこの部品ごと外れるので、待つあいだは出したまま
        const wait = key ? 0 : LEAVE_WAIT_MS;
        later(() => setBoxOn(false), wait);
        later(() => {
          setCurrent(null);
          setOpen(false);
        }, wait + MOTION.move);
      }
    }
    return () => timers.forEach(clearTimeout);
  }, [current, targetKey, loaded, key, setOpen]);

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

  const close = useCallback(() => setOpen(false), [setOpen]);

  if (!current) return null;

  const body = (
    <div className={`transition-opacity duration-move ${textOn ? '' : 'opacity-0'}`}>
      {linkify(current.text)}
    </div>
  );

  return (
    <>
      {createPortal(
        // 外枠は次に流れる曲の板と同じ（floating-panel.tsx）。置き場所・見出し・出入りの動き・閉じ方をそろえる。
        // 初めは動画の下から画面の下までを覆う板を書き起こしていて、ほかの板とばらばらだった
        <FloatingPanel open={open} onClose={close} trigger={trigger} title="説明文">
          <div
            ref={sheetBody}
            className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-4 text-sm break-words whitespace-pre-line"
          >
            {body}
          </div>
        </FloatingPanel>,
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
/** 枠の上の間（mt-6） */
const GAP = 24;
/** 枠に取れる高さがこれより低い画面では出さない（px） */
const MIN_HEIGHT = 120;

/** 流すのをやめてから消し始めるまで待つ長さ（ミリ秒） */
const LEAVE_WAIT_MS = 400;

/** 取った説明文（動画ごと）。画面を移っても残し、同じ動画の説明文を取り直さない */
const known = new Map<string, string>();

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

/**
 * 詳細画面（ボカロPの画面・一覧の再生用の画面・ラジオの画面・お気に入りの曲の画面）に置く説明文。
 * button は「再生」の段と動画の下の帯に並べる説明文のボタン（パソコンより狭い幅だけ。説明文が無いあいだは null）、
 * view は動画の下の枠と全文の板。song はその画面で動画を大きく出しているときの曲（出していなければ null）
 */
export function useStageNotes(song: QueueItem | null) {
  const [open, setOpen] = useState(false);
  const [available, setAvailable] = useState(false);
  // 板を開いたボタン（「再生」の段か、動画の下の帯）。閉じたらそこにフォーカスを戻す
  const trigger = useRef<HTMLButtonElement | null>(null);
  const button = available ? (
    <button
      type="button"
      onClick={(e) => {
        trigger.current = e.currentTarget;
        setOpen((o) => !o);
      }}
      aria-label="説明文"
      title="説明文"
      className={`grid ${ICON} text-muted hover:text-foreground lg:hidden`}
    >
      <Icon name="notes" className="size-5" />
    </button>
  ) : null;
  const view = (
    <SongNotes
      song={song}
      open={open}
      setOpen={setOpen}
      trigger={trigger}
      onAvailable={setAvailable}
    />
  );
  return { button, view };
}
