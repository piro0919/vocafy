'use client';

import Link from 'next/link';
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { QueueItem } from '@/lib/catalog';
import { EASE_OUT, prefersReducedMotion } from '@/lib/motion';
import { Icon } from '../icon';
import { PlayerBar } from './player-bar';
import { loadYouTubeApi, type YTPlayer } from './youtube';
import { PlayerKeys } from './player-keys';
import { useWakeLock } from './use-wake-lock';

/**
 * いま何の並びで流しているか。
 * - list: ボカロPの画面の曲の並び（その画面から流したとき）
 * - pending: 曲の一覧から1曲だけ流し始め、ボカロPの画面に着いたらその人の曲に差し替える途中
 */
export type PlayContext = 'list' | 'pending';

/** 時刻は YouTube から 0.5 秒おきに拾う。at は拾った瞬間で、その間は表示側で補って進める */
export type PlaybackTime = { current: number; duration: number; at: number };

type PlayerContext = {
  queue: QueueItem[];
  index: number;
  current: QueueItem | null;
  playing: boolean;
  /** 曲を選んでから音が出るまで。最初の1曲は YouTube の仕組みの読み込みも待つ */
  loading: boolean;
  context: PlayContext;
  /** 前の曲・次の曲へ進めるか。ループ（全体）なら最後の曲からも次へ進める */
  hasPrev: boolean;
  hasNext: boolean;
  /** ループ。all は並び全体を繰り返し、one は今の曲を繰り返す */
  repeat: Repeat;
  /** ランダム再生。いま流している並びの中で混ぜる */
  shuffle: boolean;
  toggleRepeat: () => void;
  toggleShuffle: () => void;
  /** 曲の一覧を順番待ちに積み、start 番目から再生する */
  playQueue: (items: QueueItem[], start: number, context?: PlayContext) => void;
  /**
   * 流している曲は止めずに、順番待ちだけを差し替える。曲の一覧から押したときは、まずその1曲を
   * 流し始め、ボカロPの画面に着いたところでその人の曲に差し替える（producer-player.tsx）
   */
  adoptQueue: (items: QueueItem[], index: number) => void;
  toggle: () => void;
  step: (dir: 1 | -1) => void;
  /** 再生をやめ、プレイヤーを消す */
  close: () => void;
  seek: (seconds: number) => void;
  time: PlaybackTime;
  /** 音量（0〜100）と消音。このブラウザに残し、次に開いたときもその音量で始める */
  volume: number;
  muted: boolean;
  setVolume: (volume: number) => void;
  toggleMute: () => void;
  /** ボカロPの画面で、プレイヤーを大きく置く場所 */
  setSlot: (el: HTMLElement | null) => void;
};

const Context = createContext<PlayerContext | null>(null);

const VOLUME_KEY = 'vocafy-volume';
const PLAYBACK_KEY = 'vocafy-playback';

export type Repeat = 'all' | 'one';

/** 残しておいたループとランダムの設定。読めなければ、ループは全体、ランダムは切 */
function savedPlayback(): { repeat: Repeat; shuffle: boolean } {
  try {
    const saved = JSON.parse(localStorage.getItem(PLAYBACK_KEY) ?? 'null') as {
      repeat?: unknown;
      shuffle?: unknown;
    } | null;
    return { repeat: saved?.repeat === 'one' ? 'one' : 'all', shuffle: saved?.shuffle === true };
  } catch {
    return { repeat: 'all', shuffle: false };
  }
}

function savePlayback(value: { repeat: Repeat; shuffle: boolean }) {
  try {
    localStorage.setItem(PLAYBACK_KEY, JSON.stringify(value));
  } catch {
    // 保存できない窓では、開き直すと元に戻る
  }
}

/**
 * 流す順。ランダムでなければ並びどおり、ランダムなら start を先頭にして残りを混ぜる。
 * 前の曲へ戻ったときに同じ曲へ戻れるよう、混ぜた順は覚えておく
 */
function buildOrder(length: number, start: number, shuffle: boolean): number[] {
  const order = Array.from({ length }, (_, i) => i);
  if (!shuffle) return order;
  const rest = order.filter((i) => i !== start);
  for (let i = rest.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [rest[i], rest[j]] = [rest[j], rest[i]];
  }
  return [start, ...rest];
}

/** 残しておいた音量と消音。読めなければ 100 で消音なし */
function savedVolume(): { volume: number; muted: boolean } {
  try {
    const saved = JSON.parse(localStorage.getItem(VOLUME_KEY) ?? 'null') as {
      volume?: unknown;
      muted?: unknown;
    } | null;
    const volume =
      typeof saved?.volume === 'number' ? Math.min(100, Math.max(0, saved.volume)) : 100;
    return { volume, muted: saved?.muted === true };
  } catch {
    return { volume: 100, muted: false };
  }
}

function saveVolume(volume: number, muted: boolean) {
  try {
    localStorage.setItem(VOLUME_KEY, JSON.stringify({ volume, muted }));
  } catch {
    // 保存できない窓では、開き直すと 100 に戻る
  }
}

export function usePlayer(): PlayerContext {
  const ctx = useContext(Context);
  if (!ctx) throw new Error('usePlayer は PlayerProvider の内側で使う');
  return ctx;
}

/**
 * 右下の窓の位置と大きさ。スマホでは下のタブと帯の上、パソコンでは帯の上。
 * スマホは画面が狭いので、規約の下限（200×200）ちょうどの正方形にする。16:9 の動画は窓の中で上下に黒い帯が入る。
 * パソコンは 16:9 の 356×200
 */
const DOCK =
  'fixed right-3 bottom-[calc(8.25rem+12px)] h-[200px] w-[200px] md:right-4 md:bottom-[calc(4rem+16px)] md:w-[356px]';
/** 窓のすぐ上に付ける帯 */
const DOCK_STRIP =
  'fixed right-3 bottom-[calc(8.25rem+12px+200px)] h-9 w-[200px] md:right-4 md:bottom-[calc(4rem+16px+200px)] md:w-[356px]';
/** 出入りの動き。閉じたあとは少し下へずらして消す */
const FADE = 'transition-[opacity,translate,visibility] duration-300 ease-(--ease-out)';
const HIDDEN = 'pointer-events-none invisible translate-y-4 opacity-0';

/**
 * ページを移っても再生が続く、全ページ共通のプレイヤー。ルートのレイアウトに1つだけ置く。
 *
 * YouTube の規約で、プレイヤーは 200×200 以上で常に見えていなければならず、上に何も重ねられない。
 * そのため小さく畳まず、右下に 200 の高さで出したままにする（dock）。ボカロPの画面では、
 * その人の曲を流している間だけ、画面内の置き場所（slot）に重ねて大きく出す。
 * iframe を DOM の中で動かすと読み込み直しになり再生が止まるので、要素は動かさず位置だけ合わせる
 */
export function PlayerProvider({ children }: { children: ReactNode }) {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [context, setContext] = useState<PlayContext>('list');
  // 曲送り（YouTube の onStateChange から呼ばれる）でも、いまの並びの種類を引き継ぐ
  const contextRef = useRef<PlayContext>('list');
  useEffect(() => {
    contextRef.current = context;
  }, [context]);
  const [time, setTime] = useState<PlaybackTime>({ current: 0, duration: 0, at: 0 });
  const [slot, setSlot] = useState<HTMLElement | null>(null);
  // 残しておいた音量は、最初に曲を流したときに読む（サーバーでは localStorage を読めず、帯も曲を流すまで出ない）
  const [sound, setSound] = useState({ volume: 100, muted: false });
  const soundRef = useRef<{ volume: number; muted: boolean } | null>(null);
  // ループとランダム。音量と同じく、最初に曲を流したときに読む
  const [playback, setPlayback] = useState<{ repeat: Repeat; shuffle: boolean }>({
    repeat: 'all',
    shuffle: false,
  });
  const playbackRef = useRef<{ repeat: Repeat; shuffle: boolean } | null>(null);
  // 流す順（順番待ちの何番目を、どの順で流すか）と、いまその何番目にいるか
  const order = useRef<number[]>([]);
  const [position, setPosition] = useState(0);
  const positionRef = useRef(0);

  const frame = useRef<HTMLDivElement>(null);
  const player = useRef<YTPlayer | null>(null);
  // YouTube の onStateChange は作ったときの関数を持ち続けるので、今の順番待ちは ref にも持つ
  const state = useRef({ queue, index });
  // 曲が終わったときの処理。load から自分自身を呼ぶことになるので、ref を通して呼ぶ
  const onEnded = useRef(() => {});

  const load = useCallback((items: QueueItem[], at: number, ctx: PlayContext = 'list') => {
    setContext(ctx);
    if (!soundRef.current) {
      soundRef.current = savedVolume();
      setSound(soundRef.current);
    }
    if (!playbackRef.current) {
      playbackRef.current = savedPlayback();
      setPlayback(playbackRef.current);
    }
    // 新しい並びなら流す順を作り直す。同じ並びの中で曲を移るだけなら、流す順はそのまま
    if (items !== state.current.queue) {
      order.current = buildOrder(items.length, at, playbackRef.current.shuffle);
    }
    positionRef.current = Math.max(0, order.current.indexOf(at));
    setPosition(positionRef.current);
    state.current = { queue: items, index: at };
    setQueue(items);
    setIndex(at);
    setLoading(true);
    setTime({ current: 0, duration: 0, at: performance.now() });
    const videoId = items[at].videoId;
    if (player.current) {
      player.current.loadVideoById(videoId);
      return;
    }
    void loadYouTubeApi().then((YT) => {
      if (!frame.current || player.current) return;
      const el = document.createElement('div');
      frame.current.replaceChildren(el);
      player.current = new YT.Player(el, {
        videoId,
        // 表示はなるべく減らす。操作は Vocafy の帯でするので、YouTube の操作バーは出さない。
        // 上部の題名と「YouTube で見る」のロゴは、パラメータでは消せない（消そうとして上に重ねるのは規約違反）
        playerVars: {
          autoplay: 1,
          playsinline: 1,
          rel: 0, // 一時停止中の関連動画を、同じチャンネルのものに絞る
          controls: 0,
          iv_load_policy: 3, // 動画の注釈を出さない
          disablekb: 1, // プレイヤー内のキー操作で帯の表示とずれないようにする
        },
        events: {
          onReady: (e) => {
            // 残しておいた音量で始める
            const { volume, muted } = soundRef.current ?? { volume: 100, muted: false };
            e.target.setVolume(volume);
            if (muted) e.target.mute();
            e.target.playVideo();
          },
          onStateChange: ({ data }) => {
            if (data === YT.PlayerState.PLAYING) {
              setPlaying(true);
              setLoading(false);
            }
            if (data === YT.PlayerState.PAUSED) setPlaying(false);
            if (data === YT.PlayerState.ENDED) onEnded.current();
          },
          // 再生できない動画（削除・非公開・埋め込み不可・有料会員限定など）は、読み込み中のまま止めず、次の曲へ進む
          onError: () => {
            setLoading(false);
            onEnded.current();
          },
        },
      });
    });
  }, []);

  /**
   * 流す順で前後の曲へ。ループは全体なので、最後の曲の次は先頭へ戻る。
   * ランダムのときは、ひと回りしたら混ぜ直す（同じ順の繰り返しにしない）
   */
  const next = useCallback(
    (dir: 1 | -1) => {
      const { queue: q } = state.current;
      if (q.length === 0) return;
      let pos = positionRef.current + dir;
      if (pos < 0) return;
      if (pos >= order.current.length) {
        const shuffle = playbackRef.current?.shuffle ?? false;
        order.current = buildOrder(
          q.length,
          shuffle ? Math.floor(Math.random() * q.length) : 0,
          shuffle,
        );
        pos = 0;
      }
      load(q, order.current[pos], contextRef.current);
    },
    [load],
  );
  const step = next;

  useEffect(() => {
    // 曲が終わったら、ループが1曲なら頭から、そうでなければ流す順の次の曲へ（最後なら先頭に戻る）
    onEnded.current = () => {
      if (playbackRef.current?.repeat === 'one' && player.current) {
        player.current.seekTo(0, true);
        player.current.playVideo();
        return;
      }
      next(1);
    };
  }, [next]);

  const toggleShuffle = useCallback(() => {
    const now = playbackRef.current ?? savedPlayback();
    const value = { ...now, shuffle: !now.shuffle };
    playbackRef.current = value;
    setPlayback(value);
    savePlayback(value);
    // いまの曲を起点に、流す順を作り直す
    const { queue: q, index: i } = state.current;
    order.current = buildOrder(q.length, i, value.shuffle);
    positionRef.current = Math.max(0, order.current.indexOf(i));
    setPosition(positionRef.current);
  }, []);

  const toggleRepeat = useCallback(() => {
    const now = playbackRef.current ?? savedPlayback();
    const value = { ...now, repeat: now.repeat === 'all' ? ('one' as const) : ('all' as const) };
    playbackRef.current = value;
    setPlayback(value);
    savePlayback(value);
  }, []);

  const adopt = useCallback((items: QueueItem[], at: number) => {
    order.current = buildOrder(items.length, at, playbackRef.current?.shuffle ?? false);
    positionRef.current = Math.max(0, order.current.indexOf(at));
    setPosition(positionRef.current);
    state.current = { queue: items, index: at };
    setContext('list');
    setQueue(items);
    setIndex(at);
  }, []);

  const close = useCallback(() => {
    player.current?.destroy();
    player.current = null;
    frame.current?.replaceChildren();
    state.current = { queue: [], index: 0 };
    setQueue([]);
    setIndex(0);
    setPlaying(false);
    setLoading(false);
  }, []);

  // 再生中は時刻を拾う。間は帯の側で補ってなめらかに進める
  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => {
      const p = player.current;
      if (p)
        setTime({ current: p.getCurrentTime(), duration: p.getDuration(), at: performance.now() });
    }, 500);
    return () => clearInterval(id);
  }, [playing]);

  const current = queue[index] ?? null;
  useWakeLock(playing);
  const mode = queue.length === 0 ? 'none' : slot ? 'slot' : 'dock';

  // 閉じたあとも、帯が下へ消えきるまでは最後の曲を出しておく
  const [shown, setShown] = useState<QueueItem | null>(null);
  if (current && current !== shown) setShown(current);

  // 右下の窓と大きな置き場所を行き来するとき、元の位置と大きさから滑らかに移す（FLIP）。
  // 動かすのは見た目の transform だけで、iframe そのものは動かさない
  const lastBox = useRef<DOMRect | null>(null);
  const lastMode = useRef(mode);
  // 前の形になった時刻。一瞬（1フレームほど）しか続かなかった形からは、移る動きを見せない
  const lastModeAt = useRef(0);

  // ボカロPの画面では、プレイヤーを画面に固定し、置き場所の位置と大きさに合わせ続ける。
  // 置き場所は曲目をスクロールしても上に貼り付く（sticky）ので、ページの中ではなく画面の座標で合わせる。
  // 貼り付いているあいだは位置が変わらないので、スクロールに付いていく遅れは見えない。
  // スクロールのたびに React を通すと全体が描き直しになるので、要素の style を直接書き換える
  useLayoutEffect(() => {
    const el = frame.current;
    if (!el) return;
    const from = lastBox.current;

    let cleanup = () => {};
    if (mode === 'slot' && slot) {
      let pending = 0;
      const place = () => {
        pending = 0;
        // 画面を移るとき、置き場所がページから外れたあとに一度だけ呼ばれることがある。外れた要素は
        // 大きさ0として測られ、プレイヤーまで大きさ0になるので合わせない
        if (!slot.isConnected) return;
        const r = slot.getBoundingClientRect();
        if (r.width === 0) return;
        // プレイヤーはページの外側の層にあり、ページの中のヘッダーより上に描かれる。
        // スクロールでヘッダーの下に潜った分は、上側を切り取って見せない（スマホは置き場所を貼り付けないので潜る）
        const headerBottom = document.querySelector('header')?.getBoundingClientRect().bottom ?? 0;
        const hidden = Math.max(0, Math.min(r.height, headerBottom - r.top));
        el.style.clipPath = hidden > 0 ? `inset(${hidden}px 0 0 0)` : '';
        el.style.top = `${r.top}px`;
        el.style.left = `${r.left}px`;
        el.style.width = `${r.width}px`;
        el.style.height = `${r.height}px`;
        // 次に移るときの出発点。置き場所はスクロールで動くので、合わせるたびに覚えておく
        lastBox.current = r;
      };
      const schedule = () => {
        pending ||= requestAnimationFrame(place);
      };
      place();
      const observer = new ResizeObserver(schedule);
      observer.observe(slot);
      observer.observe(document.body);
      window.addEventListener('scroll', schedule, { passive: true });
      window.addEventListener('resize', schedule);
      cleanup = () => {
        cancelAnimationFrame(pending);
        observer.disconnect();
        window.removeEventListener('scroll', schedule);
        window.removeEventListener('resize', schedule);
      };
    } else {
      el.style.removeProperty('top');
      el.style.removeProperty('left');
      el.style.removeProperty('width');
      el.style.removeProperty('height');
      el.style.removeProperty('clip-path');
      // 右下の窓は画面に固定なので、大きさが変わるのは画面の幅が変わったときだけ
      const remember = () => {
        lastBox.current = el.getBoundingClientRect();
      };
      window.addEventListener('resize', remember);
      cleanup = () => window.removeEventListener('resize', remember);
    }

    const to = el.getBoundingClientRect();
    // 最初の1曲を流し始めたときは、置き場所が知らされるまでの一瞬だけ右下の窓の形になる。
    // それを「右下から移ってきた」と取り違えないよう、すぐ切り替わった形は、無かったものとして扱う
    const previous =
      lastMode.current === 'dock' && performance.now() - lastModeAt.current < 100
        ? 'none'
        : lastMode.current;
    const moved = previous !== mode && previous !== 'none' && mode !== 'none';
    if (previous === 'none' && mode === 'slot' && !prefersReducedMotion()) {
      // 何も流していなかったところから大きな置き場所に出るときは、その場でふわっと出す
      el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 300, easing: EASE_OUT });
    }
    if (moved && from && to.width > 0 && !prefersReducedMotion()) {
      el.animate(
        [
          {
            transformOrigin: 'top left',
            transform: `translate(${from.left - to.left}px, ${from.top - to.top}px) scale(${from.width / to.width}, ${from.height / to.height})`,
          },
          { transformOrigin: 'top left', transform: 'none' },
        ],
        { duration: 400, easing: EASE_OUT },
      );
    }
    if (lastMode.current !== mode) lastModeAt.current = performance.now();
    lastMode.current = mode;
    lastBox.current = to;

    // 出発点は後片付けの中では測らない。後片付けが動く時点では、要素はもう次の指定に切り替わっていて、
    // 位置の決まっていない（ページの左下の）箱を測ってしまう
    return cleanup;
  }, [mode, slot]);

  // 右下のプレイヤーが本文の最後を隠さないよう、本文の下の余白を変えるための印
  useEffect(() => {
    document.documentElement.dataset.player = mode;
  }, [mode]);

  const value = useMemo<PlayerContext>(
    () => ({
      queue,
      index,
      current,
      playing,
      loading,
      context,
      hasPrev: position > 0,
      // ループは全体か1曲なので、並びが2曲以上あれば最後の曲からも次へ進める
      hasNext: queue.length > 1,
      repeat: playback.repeat,
      shuffle: playback.shuffle,
      toggleRepeat,
      toggleShuffle,
      playQueue: load,
      adoptQueue: adopt,
      toggle: () => (playing ? player.current?.pauseVideo() : player.current?.playVideo()),
      step,
      close,
      seek: (seconds) => {
        player.current?.seekTo(seconds, true);
        setTime((t) => ({ ...t, current: seconds, at: performance.now() }));
      },
      time,
      volume: sound.volume,
      muted: sound.muted,
      setVolume: (volume) => {
        // つまみを動かしたら消音は解く
        const next = { volume, muted: false };
        soundRef.current = next;
        setSound(next);
        saveVolume(volume, false);
        player.current?.setVolume(volume);
        player.current?.unMute();
      },
      toggleMute: () => {
        const now = soundRef.current ?? sound;
        const next = { ...now, muted: !now.muted };
        soundRef.current = next;
        setSound(next);
        saveVolume(next.volume, next.muted);
        if (next.muted) player.current?.mute();
        else player.current?.unMute();
      },
      setSlot,
    }),
    [
      queue,
      index,
      current,
      playing,
      loading,
      context,
      position,
      playback,
      toggleRepeat,
      toggleShuffle,
      load,
      adopt,
      step,
      close,
      time,
      sound,
    ],
  );

  return (
    <Context value={value}>
      {children}
      {/*
        右下の窓の上に付ける帯。押すと流しているボカロPの画面に移り、そこで大きく出る。
        窓の中は YouTube のプレイヤーで、押すと YouTube 側の操作になるので、入口は窓の外に置く
      */}
      <div
        aria-hidden={mode !== 'dock'}
        inert={mode !== 'dock'}
        className={`chrome-bottom ${DOCK_STRIP} ${FADE} z-30 flex items-center rounded-t-lg bg-sidebar/60 backdrop-blur-lg backdrop-saturate-150 ${mode === 'dock' ? '' : HIDDEN}`}
      >
        {shown && (
          <Link
            href={`/producers/${shown.producerId}`}
            className="flex h-full min-w-0 flex-1 items-center gap-2 pl-3 text-xs text-muted transition-colors hover:text-foreground"
          >
            <span className="min-w-0 flex-1 truncate">
              <span className="font-bold text-foreground">{shown.title}</span>
              {' ・ '}
              {shown.producerName}
            </span>
            <Icon name="expand" className="size-4 shrink-0" />
          </Link>
        )}
        {/* 窓だけ消して音を流し続けることはできない（プレイヤーは見えている必要がある）ので、下の帯の × と同じく再生ごと止める */}
        <button
          type="button"
          aria-label="プレイヤーを閉じる"
          onClick={close}
          className="grid h-full w-9 shrink-0 place-items-center text-muted transition-[color,scale] duration-150 ease-out hover:text-foreground active:scale-90"
        >
          <Icon name="close" className="size-4" />
        </button>
      </div>
      {/* プレイヤーの上には何も重ねない（YouTube の規約）。200×200 を下回らない */}
      <div
        ref={frame}
        // E2E テストや確かめのときに、プレイヤーの枠を見つける目印
        data-player-frame
        className={
          mode === 'slot'
            ? 'fixed z-10 overflow-hidden rounded-lg bg-black [&>iframe]:size-full'
            : `chrome-bottom ${DOCK} ${FADE} z-30 overflow-hidden rounded-b-lg bg-black shadow-2xl shadow-black/20 dark:shadow-black/60 [&>iframe]:size-full ${mode === 'none' ? HIDDEN : ''}`
        }
      />
      <PlayerBar item={shown} open={mode !== 'none'} />
      <PlayerKeys />
    </Context>
  );
}
