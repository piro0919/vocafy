'use client';

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import { toast } from 'sonner';
import { isAppleDevice } from '@/lib/apple-device';
import { keepAwake, letSleep } from './keep-awake';
import type { QueueItem } from '@/lib/catalog';
import { PlayerBar } from './player-bar';
import type { Engine, EngineEvents, Sound } from './engine';
import { createNiconicoEngine } from './niconico';
import { createNiconicoPool, type NiconicoPool, type Preloaded } from './niconico-pool';
import { createYouTubeEngine } from './youtube';
import { PlayerKeys } from './player-keys';
import { useWakeLock } from './use-wake-lock';
import { DOCK, DockStrip, FADE, HIDDEN } from './dock-strip';
import { clearResume, readResume, saveResume } from './player-resume';
import { FadeImage } from '../fade-image';
import { Icon } from '../icon';
import { COVER_PLAY } from '../button-styles';
import {
  appendItems,
  type Cursor,
  EMPTY_CURSOR,
  firstMore,
  followingPage,
  freshItems,
  isNearEnd,
  moveTo,
  radioSeeds,
  restart,
  stepFrom,
  upcomingOf,
  withOrder,
} from './queue-state';
import { savedPlayback, savedVolume, savePlayback, saveVolume } from './player-storage';
import type {
  ListSource,
  Owner,
  PlaybackTime,
  PlayerContext,
  QueueOwner,
  Repeat,
  Sleep,
} from './player-types';
import {
  afterEnded,
  type BeforeRadio,
  radioExit,
  LOOSE,
  ownerOf,
  PENDING,
  settledOwner,
  skipsAutoNiconico,
} from './player-rules';
import { FADE_OUT_MS, FADE_STEPS, faded, fadeOut, PAUSE_WAIT_MS } from './fade';
import { useFrameLayout } from './use-frame-layout';
import { useSlot } from './use-slot';
import { IMAGE_SIZES } from '@/lib/image-sizes';
import { MINUTE_MS, TIMING } from '@/lib/timing';

export type { ListSource, Owner, PlaybackTime, Repeat, Sleep } from './player-types';

const Context = createContext<PlayerContext | null>(null);

export function usePlayer(): PlayerContext {
  const ctx = useContext(Context);
  if (!ctx) throw new Error('usePlayer は PlayerProvider の内側で使う');
  return ctx;
}

/**
 * 次に流れる曲として見せる数。並び全体は開いている画面の一覧に出ているので、板は次に来る曲を見るだけにする
 * （100曲まで出していたら多すぎると言われた）
 */
const UPCOMING_LIMIT = 10;

/** ラジオで足せる関連曲を探すときに、関連曲を聞く曲の数の上限 */
const RADIO_TRIES = 6;

/** 流しているあいだ、どこまで聴いたかを残す間隔（ミリ秒） */
const SAVE_EVERY_MS = 5000;

/** スリープタイマーで止めるときに、音を絞りきるまでの長さ（ミリ秒）。眠りかけの耳に急に切れないよう、曲を替えるときより長く */
const SLEEP_FADE_MS = 3000;

/**
 * ページを移っても再生が続く、全ページ共通のプレイヤー。ルートのレイアウトに1つだけ置く。
 *
 * 流す仕組みは曲ごとに YouTube かニコニコ（YouTube に本家が無い曲だけ）で、engine.ts の形で同じように動かす。
 *
 * YouTube の規約で、プレイヤーは 200×200 以上で常に見えていなければならず、上に何も重ねられない。
 * そのため小さく畳まず、右下に 200 の高さで出したままにする（dock）。ボカロPの画面では、
 * その人の曲を流している間だけ、画面内の置き場所（slot）に重ねて大きく出す。
 * iframe を DOM の中で動かすと読み込み直しになり再生が止まるので、要素は動かさず位置だけ合わせる
 */
const noSubscribe = () => () => {};

/** 開発用: ?mock-niconico-blocked で、ニコニコの曲が止められたあと（iPad の Safari）の状態から始める */
function mockNiconicoBlocked(): boolean {
  return (
    process.env.NODE_ENV === 'development' &&
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).has('mock-niconico-blocked')
  );
}

export function PlayerProvider({ children }: { children: ReactNode }) {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  // 並びの持ち主（player-types.ts）。曲送り（プレイヤーの知らせから呼ばれる）でも引き継ぐので、ref にも持つ
  const [owner, setOwnerState] = useState<Owner>(LOOSE);
  const ownerRef = useRef<Owner>(LOOSE);
  const setOwner = useCallback((next: Owner) => {
    ownerRef.current = next;
    setOwnerState(next);
  }, []);
  const [time, setTime] = useState<PlaybackTime>({ current: 0, duration: 0, at: 0 });
  // 開き直したときに戻した、まだ流していない前の曲（player-resume.ts）。プレイヤーはまだ作っておらず、再生を押すと続きから流す。
  // resumeAt は続きの位置（秒）で、鳴り始めたところでそこへ飛ぶ
  const [resumable, setResumable] = useState(false);
  const resumeAt = useRef<number | null>(null);
  const { slot, setSlot, holdingSlot, holdSlot, waitingForSlot, waitForSlot } = useSlot();
  const mode = queue.length === 0 ? 'none' : slot ? 'slot' : waitingForSlot ? 'none' : 'dock';
  // いまの形。置き場所を待つか決めるときに読む。右下の窓がもう出ているなら待たない（waits）
  const modeRef = useRef(mode);
  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);
  // 置き場所を待つのは、右下の窓がまだ出ていないときだけ。出ているのに待つと、窓が下へずれて消えてから
  // 大きな置き場所にふわっと出た。出たまま待てば、置き場所ができたときに右下から大きく移る（use-frame-layout.ts）
  const waits = useCallback(() => modeRef.current !== 'dock', []);
  // プレイヤーの枠。置き場所か右下の窓に合わせ続ける（use-frame-layout.ts）
  const frame = useFrameLayout(mode, slot);
  // 残しておいた音量は、最初に曲を流したときに読む（サーバーでは localStorage を読めず、帯も曲を流すまで出ない）
  const [sound, setSound] = useState({ volume: 100, muted: false });
  const soundRef = useRef<{ volume: number; muted: boolean } | null>(null);
  // ループとランダム。音量と同じく、最初に曲を流したときに読む
  const [playback, setPlayback] = useState<{ repeat: Repeat; shuffle: boolean }>({
    repeat: 'all',
    shuffle: false,
  });
  const playbackRef = useRef<{ repeat: Repeat; shuffle: boolean } | null>(null);
  // 「すべて再生」で流している一覧の続き。ほかの並びに替えたら消す
  const more = useRef<ListSource | null>(null);
  // 次のページを待っているあいだに並びの最後を越えたら、先頭に戻らず、届いたところで次の曲へ進む
  const advanceAfterMore = useRef(false);
  // 待っているあいだの曲送りが、曲が終わって自動で進むものか。待つあいだに押された曲を、自動で進んだ先と取り違えないよう分けて持つ
  const advanceAuto = useRef(false);
  const clearMore = useCallback(() => {
    more.current = null;
    advanceAfterMore.current = false;
  }, []);
  const [position, setPosition] = useState(0);
  // 並びと流す順（queue-state.ts）。プレイヤーの知らせは作ったときの関数を持ち続けるので、state と別に ref にも持つ
  const cursor = useRef<Cursor>(EMPTY_CURSOR);
  const commit = useCallback((next: Cursor) => {
    cursor.current = next;
    setQueue(next.queue);
    setIndex(next.index);
    setPosition(next.position);
  }, []);

  const player = useRef<Engine | null>(null);
  // ニコニコの曲を流すあいだ、止めて隠しておく YouTube のプレイヤー。プレイヤーごとの入れ物（枠の中の div）
  const parked = useRef<Engine | null>(null);
  const boxes = useRef(new WeakMap<Engine, HTMLElement>());
  /** プレイヤーを壊し、入れ物も外す */
  const drop = useCallback((engine: Engine | null) => {
    if (!engine) return;
    engine.destroy();
    boxes.current.get(engine)?.remove();
  }, []);
  // 曲が終わったときの処理。load から自分自身を呼ぶことになるので、ref を通して呼ぶ
  const onEnded = useRef(() => {});
  // いま音が出ているか。曲を替えるときに、絞ってから切るかを決める
  const sounding = useRef(false);
  // 音量を絞っている途中か、絞り終わったら替える曲、絞る時計
  const fading = useRef(false);
  const pendingSwap = useRef<(() => void) | null>(null);
  const fadeTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  // 絞りきって消音したまま次の曲を頼んだプレイヤー。次の曲が鳴り始めたら、消音を解いて音量を上げていく
  const quiet = useRef<Engine | null>(null);
  // 曲を替えるために一時停止したプレイヤー。その一時停止の知らせは拾わない（帯が一瞬 ▶ に戻らないように）
  const pausing = useRef<Engine | null>(null);
  const riseTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  // 前後の曲へ進む（next）。load から呼ぶので、next より先に置く
  const nextRef = useRef<(dir: 1 | -1) => void>(() => {});
  // 曲が終わって自動で次へ進むところか。load が読んで下ろす。いま流している曲が自動で進んだ先か（auto）も持つ
  const autoNext = useRef(false);
  const auto = useRef(false);
  // ニコニコの曲は、iPad の Safari では自動で進んだ先だと必ず止められる（曲ごとに埋め込みを作り直すので、押した記録が残らない）。
  // 一度止められたら、このタブでは自動で進む先のニコニコの曲を読み込まずに飛ばす。自分で押した曲は ▶ で流せるので飛ばさない。
  // 並びがニコニコの曲だけのときに回り続けないよう、続けて飛ばした数（skipped）が並びの数に届いたら止まる
  const niconicoBlocked = useRef(mockNiconicoBlocked());
  const skipped = useRef(0);
  // 自動で進む先のニコニコの曲を飛ばしているか（画面に出す。次に流れる曲の板で薄くする）。最初に飛ばしたときだけ知らせる
  const [skipping, setSkipsNiconico] = useState(false);
  // 開発用の切り替えは、サーバーで描いた形と食い違わないよう、ページの準備ができてから効かせる
  const mocked = useSyncExternalStore(noSubscribe, mockNiconicoBlocked, () => false);
  const skipsNiconico = skipping || mocked;
  const skipNoticed = useRef(false);
  const noteSkip = useCallback((item: QueueItem | undefined) => {
    niconicoBlocked.current = true;
    setSkipsNiconico(true);
    if (skipNoticed.current || !item) return;
    skipNoticed.current = true;
    toast(`${item.title}をスキップしました`);
  }, []);

  // 一時停止の前に音量を絞っている途中なら、その時計
  const pauseFade = useRef<ReturnType<typeof setTimeout> | null>(null);

  /** 絞りきったプレイヤーの消音を解き、音量を絞ったときと同じ速さで、いまの音量まで上げる。上げる先は一刻みごとに読み直す */
  const rise = useCallback((engine: Engine) => {
    quiet.current = null;
    clearTimeout(riseTimer.current);
    engine.setVolume(0);
    engine.setMuted(soundRef.current?.muted ?? false);
    let step = 0;
    const tick = () => {
      if (player.current !== engine || quiet.current) return;
      step += 1;
      const { volume } = soundRef.current ?? { volume: 100 };
      engine.setVolume(Math.round((volume * step) / FADE_STEPS));
      if (step < FADE_STEPS) riseTimer.current = setTimeout(tick, FADE_OUT_MS / FADE_STEPS);
    };
    tick();
  }, []);

  /**
   * プレイヤーを作り、枠の中に自分の入れ物（div）を足して置く。知らせは、いま流しているプレイヤー（player.current）のものだけ拾う
   */
  const spawn = useCallback(
    (
      service: QueueItem['service'],
      videoId: string,
      sound: Sound,
      preloaded?: Preloaded,
    ): Engine | null => {
      if (!frame.current) return null;
      // 隠しているプレイヤーの知らせは拾わない（止めたときの一時停止が、流しているニコニコの曲の表示を変えないように）
      let engine: Engine | null = null;
      const live =
        <A extends unknown[]>(f: (...args: A) => void) =>
        (...args: A) => {
          if (player.current === engine) f(...args);
        };
      const events: EngineEvents = {
        onPlaying: () => {
          sounding.current = true;
          if (pausing.current === engine) pausing.current = null;
          if (quiet.current && quiet.current === engine) rise(engine);
          // 戻した前の曲を流し始めたら、聴いていた位置へ飛ぶ
          if (resumeAt.current !== null && engine) {
            engine.seek(resumeAt.current);
            resumeAt.current = null;
          }
          setPlaying(true);
          setLoading(false);
        },
        // 再生の開始をブラウザに止められたときも届く。読み込み中のままにせず、再生ボタンを出す
        onPaused: () => {
          if (pausing.current === engine) return;
          sounding.current = false;
          setPlaying(false);
          setLoading(false);
        },
        onEnded: () => {
          sounding.current = false;
          onEnded.current();
        },
        // 自動で進んだ先のニコニコの曲なら飛ばして次へ。それ以外は一時停止として扱い、再生ボタンを出す
        onBlocked: () => {
          sounding.current = false;
          setLoading(false);
          const { queue: q, index: i } = cursor.current;
          const skip = skipsAutoNiconico(q[i], {
            auto: auto.current,
            blocked: true,
            skipped: skipped.current,
            length: q.length,
          });
          if (skip) {
            noteSkip(q[i]);
            skipped.current += 1;
            autoNext.current = true;
            nextRef.current(1);
            return;
          }
          setPlaying(false);
        },
        // 再生できない動画（削除・非公開・埋め込み不可・有料会員限定など）は、読み込み中のまま止めず、次の曲へ進む
        onError: () => {
          sounding.current = false;
          setLoading(false);
          onEnded.current();
        },
      };
      const guarded: EngineEvents = {
        onPlaying: live(events.onPlaying),
        onPaused: live(events.onPaused),
        onEnded: live(events.onEnded),
        onBlocked: live(events.onBlocked),
        onError: live(events.onError),
      };
      // 先に読み込んでおいた埋め込みは、その入れ物ごと表に出して使う
      let box: HTMLElement;
      if (preloaded) {
        box = preloaded.box;
        box.hidden = false;
        engine = createNiconicoEngine(box, videoId, sound, guarded, preloaded);
      } else {
        box = document.createElement('div');
        box.className = 'size-full';
        frame.current.append(box);
        engine = (service === 'niconico' ? createNiconicoEngine : createYouTubeEngine)(
          box,
          videoId,
          sound,
          guarded,
        );
      }
      boxes.current.set(engine, box);
      return engine;
    },
    [frame, noteSkip, rise],
  );

  // iPad・iPhone で、見えているニコニコの曲の埋め込みを先に読み込んでおく（niconico-pool.ts）。ほかの端末では作らない
  // 曲の行の部品は先に作られて頼んでくるので、初めて頼まれたときに作る
  const pool = useRef<NiconicoPool | null>(null);
  useEffect(
    () => () => {
      pool.current?.destroy();
      pool.current = null;
    },
    [],
  );
  /** 曲の行が見えたときに呼ぶ。返す関数は見えなくなったときに呼ぶ */
  const preload = useCallback(
    (videoId: string) => {
      if (!pool.current && isAppleDevice())
        pool.current = createNiconicoPool(
          () => frame.current,
          () => cursor.current.queue[cursor.current.index]?.videoId,
        );
      return pool.current?.want(videoId) ?? (() => {});
    },
    [frame],
  );

  /** 隠している YouTube のプレイヤーに、押した操作の中で許しを付けておく（engine.ts の prime）。並びに YouTube の曲が無ければ要らない */
  const primeParked = useCallback((items: QueueItem[]) => {
    const youtube = items.find((s) => s.service === 'youtube');
    if (youtube) parked.current?.prime?.(youtube.videoId);
  }, []);

  // iPad・iPhone では、YouTube のプレイヤーを曲を押す前に作っておく（動画は入れない）。押す前から用意できていれば、
  // 押した操作の中で動画を頼めるので、Safari に1曲目を止められない。作るのを押してからにすると、仕組みの読み込みを
  // 待つあいだに押した操作の続きとみなされなくなる。ほかの端末は止められないので、開いただけで YouTube を読み込ませない
  useEffect(() => {
    if (!isAppleDevice() || player.current || parked.current) return;
    const engine = spawn('youtube', '', savedVolume());
    if (!engine) return;
    const box = boxes.current.get(engine);
    if (box) box.hidden = true;
    parked.current = engine;
  }, [spawn]);

  const load = useCallback(
    (items: QueueItem[], at: number, nextOwner: Owner) => {
      keepAwake();
      setResumable(false);
      // 戻した前の曲を流さずに別の曲を押したとき、その曲が前の曲の続きの位置から始まらないように消す（続きから流すときは resume が戻す）
      resumeAt.current = null;
      // 一時停止の前に絞っている途中なら、やめる。同じプレイヤーで次の曲を流すので、そのままだと次の曲が止まる
      if (pauseFade.current) clearTimeout(pauseFade.current);
      pauseFade.current = null;
      auto.current = autoNext.current;
      autoNext.current = false;
      setOwner(nextOwner);
      waitForSlot(nextOwner.kind === 'pending' && waits());
      if (!soundRef.current) {
        soundRef.current = savedVolume();
        setSound(soundRef.current);
      }
      if (!playbackRef.current) {
        playbackRef.current = savedPlayback();
        setPlayback(playbackRef.current);
      }
      // 新しい並びなら流す順を作り直す。同じ並びの中で曲を移るだけなら、流す順はそのまま
      commit(moveTo(cursor.current, items, at, playbackRef.current.shuffle));
      setLoading(true);
      setTime({ current: 0, duration: 0, at: performance.now() });
      const { service, videoId } = items[at];
      // 自分で押したニコニコの曲なら、押した操作のうちに隠している YouTube のプレイヤーに許しを付け、あとに続く YouTube の曲が止められないようにする
      if (!auto.current && service === 'niconico') primeParked(items);
      const skip = skipsAutoNiconico(items[at], {
        auto: auto.current,
        blocked: niconicoBlocked.current,
        skipped: skipped.current,
        length: items.length,
      });
      if (!auto.current || service !== 'niconico') skipped.current = 0;
      else if (skip) {
        noteSkip(items[at]);
        skipped.current += 1;
        autoNext.current = true;
        nextRef.current(1);
        return;
      }
      const sound = soundRef.current ?? { volume: 100, muted: false };
      const swap = () => {
        // 音量はいまの値を読む。絞っているあいだにつまみを動かされたら、動かしたあとの音量で始める
        const now = soundRef.current ?? sound;
        // 同じ仕組みの曲が続くなら、プレイヤーを使い回して動画だけ替える。絞った音量は、止めてから戻す
        // 先に読み込んでおいたニコニコの埋め込みがあれば、いまのプレイヤーを使い回さずにそれで流す
        const preloaded =
          service === 'niconico' ? (pool.current?.take(videoId) ?? undefined) : undefined;
        // 絞って替えたときは、消音と音量を戻すのは次の曲が鳴り始めてから（onPlaying の rise）。頼んだ直後に戻すと、
        // 止めた前の曲の残りか次の曲の出だしがいきなり元の音量で鳴り、プツッと聞こえた
        if (player.current?.service === service && !preloaded) {
          player.current.load(videoId);
          if (quiet.current !== player.current) player.current.setVolume(now.volume);
          return;
        }
        quiet.current = null;
        pausing.current = null;
        // YouTube からニコニコに替えるときは、YouTube のプレイヤーを壊さず、止めて隠しておく。
        // iPad の Safari は一度押して流れたプレイヤーなら自動で流すので、作り直すと次の YouTube の曲が止められる
        const leaving = player.current;
        player.current = null;
        if (leaving?.service === 'youtube') {
          leaving.pause();
          const box = boxes.current.get(leaving);
          if (box) box.hidden = true;
          parked.current = leaving;
        } else drop(leaving);
        if (service === 'youtube' && parked.current) {
          const kept = parked.current;
          parked.current = null;
          const box = boxes.current.get(kept);
          if (box) box.hidden = false;
          player.current = kept;
          kept.setMuted(now.muted);
          kept.setVolume(now.volume);
          kept.load(videoId);
          return;
        }
        player.current = spawn(service, videoId, now, preloaded);
      };
      // 鳴っている途中の音をいきなり切ると、波形が途切れてプツッと鳴る。音量を絞りきってから切り替える。
      // 絞っているあいだに別の曲が選ばれたら、絞り終わったときに最後の曲へ替える
      pendingSwap.current = swap;
      if (fading.current) return;
      const current = player.current;
      // iPad・iPhone は絞らない。埋め込みの音量を Web から変えられないので効かず、切り替えが押した操作の外へずれて、
      // 次の曲の再生を Safari に止められる
      if (!current || !sounding.current || sound.muted || sound.volume === 0 || isAppleDevice()) {
        pendingSwap.current = null;
        swap();
        return;
      }
      sounding.current = false;
      fading.current = true;
      // 音量の指示は埋め込みへの知らせなので、0 にしたのと同時に切ると、0 が効く前に切れた（fadeOut が 0 にしてから待つ）。
      // 絞りきったら、消音して一時停止し、止まりきるのを待ってから替える
      fadeOut(current, sound.volume, {
        timer: (t) => {
          fadeTimer.current = t;
        },
        done: () => {
          current.setMuted(true);
          pausing.current = current;
          current.pause();
          fadeTimer.current = setTimeout(() => {
            fading.current = false;
            quiet.current = current;
            const next = pendingSwap.current;
            pendingSwap.current = null;
            next?.();
          }, PAUSE_WAIT_MS);
        },
      });
    },
    [waitForSlot, waits, drop, spawn, primeParked, noteSkip, commit, setOwner],
  );

  /** 一覧の続きのページやラジオの関連曲を後ろに足す。いまの曲と流す順はそのままで、足した曲を流す順の後ろに付ける */
  const append = useCallback(
    (items: QueueItem[]) =>
      commit(appendItems(cursor.current, items, playbackRef.current?.shuffle ?? false)),
    [commit],
  );

  const fetchingMore = useRef(false);
  /** 一覧の次のページを取りに行って後ろに足す。取りに行っている途中なら何もしない */
  const fetchMore = useCallback(() => {
    const m = more.current;
    if (!m || fetchingMore.current) return;
    fetchingMore.current = true;
    const q = cursor.current.queue;
    fetch(`/api/list/${m.source}/${m.next}`)
      .then((res) =>
        res.ok
          ? (res.json() as Promise<QueueItem[]>)
          : Promise.reject(new Error(String(res.status))),
      )
      .then((items) => {
        // 待っているあいだに別の並びに替わっていたら、足さない
        if (more.current !== m || cursor.current.queue !== q) return;
        more.current = followingPage(m);
        const fresh = freshItems(q, items);
        if (fresh.length > 0) append(fresh);
      })
      .catch(() => {
        // 取れなかったとき、次の曲を待たせているなら続きはあきらめて、いまの並びの先頭に戻る。
        // 待たせていなければ、次に曲が進んだときにもう一度取りに行く
        if (advanceAfterMore.current && more.current === m) more.current = null;
      })
      .finally(() => {
        fetchingMore.current = false;
        if (advanceAfterMore.current) {
          advanceAfterMore.current = false;
          autoNext.current = advanceAuto.current;
          nextRef.current(1);
        }
      });
  }, [append]);

  /**
   * 流す順で前後の曲へ。ループは全体なので、最後の曲の次は先頭へ戻る。
   * ランダムのときは、ひと回りしたら混ぜ直す（同じ順の繰り返しにしない）
   */
  const next = useCallback(
    (dir: 1 | -1) => {
      const step = stepFrom(cursor.current, dir, {
        hasMore: more.current !== null,
        shuffle: playbackRef.current?.shuffle ?? false,
      });
      if (step.kind === 'stay') return;
      // 「すべて再生」の一覧にまだ続きのページがあれば、届くのを待ってから進む
      if (step.kind === 'more') {
        advanceAfterMore.current = true;
        advanceAuto.current = autoNext.current;
        autoNext.current = false;
        fetchMore();
        return;
      }
      // 流す順を作り直したとき（最後の曲の次）は、それを入れてから流す。load は同じ並びなら流す順をそのまま使う
      cursor.current = { ...cursor.current, order: step.order };
      load(cursor.current.queue, step.index, ownerRef.current);
    },
    [load, fetchMore],
  );
  const step = next;
  useEffect(() => {
    nextRef.current = next;
  }, [next]);

  // 「すべて再生」で流す順の終わりが近づいたら（残り1曲まで）、一覧の次のページを取りに行って後ろに足す
  useEffect(() => {
    if (owner.kind !== 'list' || more.current?.source !== owner.source || queue.length === 0)
      return;
    if (isNearEnd(position, cursor.current.order)) fetchMore();
  }, [owner, queue, position, fetchMore]);

  // スリープタイマー。onEnded（作ったときの関数を持ち続ける）から読むので、ref にも持つ
  const [sleep, setSleepState] = useState<Sleep | null>(null);
  const sleepRef = useRef<Sleep | null>(null);
  const setSleep = useCallback((value: number | 'end' | null) => {
    const from = Date.now();
    const next: Sleep | null =
      value === null
        ? null
        : value === 'end'
          ? { kind: 'end' }
          : { kind: 'at', at: from + value * MINUTE_MS, from };
    sleepRef.current = next;
    setSleepState(next);
  }, []);
  // 時刻で止めるタイマー。時間が来たら SLEEP_FADE_MS かけて音を絞ってから一時停止し、音量を元に戻しておく
  // （次に再生を押したときは、いつもの音量で鳴る）
  useEffect(() => {
    if (sleep?.kind !== 'at') return;
    let fadeTimer: ReturnType<typeof setTimeout> | undefined;
    // 絞っている途中で切られたとき（タイマーを切る・入れ直す）に、音量を戻すための控え
    let restore: (() => void) | null = null;
    const timer = setTimeout(
      () => {
        // 状態（sleep）を消すのは止め終えてから。先に消すと、このエフェクトの後片付けが走って、絞っている途中の時計まで止まった
        const done = () => {
          sleepRef.current = null;
          setSleepState(null);
        };
        const p = player.current;
        const { volume, muted } = soundRef.current ?? { volume: 100, muted: false };
        if (!p || muted || volume === 0) {
          p?.pause();
          done();
          return;
        }
        let step = 0;
        restore = () => p.setVolume(volume);
        const tick = () => {
          step += 1;
          if (step > FADE_STEPS) {
            restore = null;
            p.pause();
            p.setVolume(volume);
            done();
            return;
          }
          p.setVolume(faded(volume, step));
          fadeTimer = setTimeout(tick, SLEEP_FADE_MS / FADE_STEPS);
        };
        tick();
      },
      Math.max(0, sleep.at - Date.now()),
    );
    return () => {
      clearTimeout(timer);
      clearTimeout(fadeTimer);
      restore?.();
    };
  }, [sleep]);

  useEffect(() => {
    // 曲が終わったら、ループが1曲なら頭から、そうでなければ流す順の次の曲へ（最後なら先頭に戻る）
    onEnded.current = () => {
      // スリープタイマーが「この曲が終わったら」なら、次へ進まずに止める（曲は終わったところで止まっている）
      const action = afterEnded(sleepRef.current, playbackRef.current?.repeat);
      if (action === 'stop') {
        sleepRef.current = null;
        setSleepState(null);
        // 曲が終わったときは「止まった」の知らせが来ないので、流していない表示にここで切り替える
        setPlaying(false);
        return;
      }
      if (action === 'repeat' && player.current) {
        player.current.seek(0);
        player.current.play();
        return;
      }
      autoNext.current = true;
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
    commit(restart(cursor.current.queue, cursor.current.index, value.shuffle));
  }, [commit]);

  const toggleRepeat = useCallback(() => {
    const now = playbackRef.current ?? savedPlayback();
    const value = { ...now, repeat: now.repeat === 'all' ? ('one' as const) : ('all' as const) };
    playbackRef.current = value;
    setPlayback(value);
    savePlayback(value);
  }, []);

  const adopt = useCallback(
    (items: QueueItem[], at: number, nextOwner: Owner) => {
      commit(restart(items, at, playbackRef.current?.shuffle ?? false));
      setOwner(nextOwner);
    },
    [commit, setOwner],
  );

  const playAll = useCallback(
    (
      items: QueueItem[],
      source: Omit<ListSource, 'next'>,
      { at = 0, moving = false }: { at?: number; moving?: boolean } = {},
    ) => {
      load(items, at, { kind: 'list', source: source.source });
      if (moving) {
        // 一覧の再生用の画面へ移る途中。曲の一覧から押してボカロPの画面へ移るとき（pending）と同じく、置き場所を待つ
        waitForSlot(waits());
      }
      more.current = firstMore(source);
    },
    [load, waitForSlot, waits],
  );

  // ラジオを始める前に流していた並び。ラジオをやめたら、ここへ戻す
  const beforeRadio = useRef<BeforeRadio | null>(null);
  // ラジオの中で押し直したとき（いまの曲から始め直す）は、ラジオの前の並びを上書きしない
  const rememberBeforeRadio = useCallback(() => {
    if (ownerRef.current.kind === 'radio') return;
    beforeRadio.current = {
      queue: cursor.current.queue,
      index: cursor.current.index,
      owner: ownerRef.current,
      more: more.current,
    };
  }, []);

  const startRadio = useCallback(
    (seed: QueueItem) => {
      rememberBeforeRadio();
      clearMore();
      const radio: Owner = { kind: 'radio', home: `/radio/${seed.songId}` };
      const { queue: q, index: i } = cursor.current;
      // ラジオの画面へ移る途中。一覧の再生用の画面へ移るとき（playAll の moving）と同じく、置き場所を待つ（waitForSlot）
      if (q[i]?.songId !== seed.songId) {
        load([seed], 0, radio);
        waitForSlot(waits());
        return;
      }
      commit(restart([seed], 0, false));
      setOwner(radio);
      waitForSlot(waits());
    },
    [load, clearMore, rememberBeforeRadio, commit, setOwner, waitForSlot, waits],
  );

  const playRadio = useCallback(
    (items: QueueItem[], at: number) => {
      if (items.length === 0) return;
      rememberBeforeRadio();
      clearMore();
      load(items, at, { kind: 'radio', home: `/radio/${items[0].songId}` });
    },
    [load, clearMore, rememberBeforeRadio],
  );

  const fillRadio = useCallback(
    (items: QueueItem[]) => {
      const { queue: q } = cursor.current;
      if (ownerRef.current.kind !== 'radio' || q.length !== 1 || items[0]?.songId !== q[0].songId) {
        return;
      }
      append(items.slice(1));
    },
    [append],
  );

  const stopRadio = useCallback(
    (moving: boolean) => {
      const { queue: q, index: i } = cursor.current;
      const exit = radioExit(q[i], beforeRadio.current);
      beforeRadio.current = null;
      if (exit.kind === 'empty') {
        adopt([], 0, LOOSE);
        return exit.href;
      }
      if (exit.kind === 'restore') {
        const { before } = exit;
        adopt(before.queue, before.index, exit.owner);
        more.current = before.more;
        return exit.href;
      }
      // 曲の一覧から押したときと同じく、その1曲だけの並びにしておき、ボカロPの画面に着いたところでその人の曲に差し替える
      // （producer-player.tsx）。画面を移らないときは、その人の曲をここで取って差し替える
      const now = exit.item;
      const items = [now];
      adopt(items, 0, PENDING);
      if (!moving) {
        void fetch(`/api/producer-queue/${now.producerId}`)
          .then((res) => (res.ok ? (res.json() as Promise<QueueItem[]>) : []))
          .catch(() => [])
          .then((songs) => {
            // 待っているあいだに別の並びに替わっていたら、差し替えない
            if (cursor.current.queue !== items) return;
            const at = songs.findIndex((s) => s.songId === now.songId);
            if (at >= 0) adopt(songs, at, { kind: 'producer', producerId: now.producerId });
          });
      }
      return exit.href;
    },
    [adopt],
  );

  const takeOver = useCallback(
    (items: QueueItem[], at: number, page: QueueOwner) => {
      clearMore();
      beforeRadio.current = null;
      adopt(items, at, ownerOf(page));
      if (page.kind === 'list') more.current = firstMore(page.source);
    },
    [adopt, clearMore],
  );

  const followProducer = useCallback(() => {
    const { queue: q, index: i } = cursor.current;
    const now = q[i];
    if (!now) return;
    clearMore();
    beforeRadio.current = null;
    adopt([now], 0, PENDING);
    // ボカロPの画面が開くまで、いまの画面の置き場所に動画を出し続ける。出し続けないと、この画面がもう持ち主でなくなり、
    // 開くまでの一瞬だけ右下の窓になった
    holdSlot();
  }, [adopt, clearMore, holdSlot]);

  // ラジオで流す順の終わりが近づいたら（残り1曲まで）、いまの曲の関連曲のうち、まだ並びに無いものを後ろに足す。
  // いまの曲の関連曲がどれも並びに入っているとき（ラジオの画面で一覧の最後の曲を押したときなど）は、並びの後ろの曲から
  // 順にさかのぼって、足せる曲が見つかるまで RADIO_TRIES 曲まで試す。足さないと次に流れる曲が空になり、最後の曲のあとは
  // 先頭に戻っていた。関連曲の答えは CDN に置いてあるので、さかのぼっても DB はほぼ起きない
  const extending = useRef(false);
  useEffect(() => {
    if (
      owner.kind !== 'radio' ||
      queue.length === 0 ||
      !isNearEnd(position, cursor.current.order)
    ) {
      return;
    }
    if (extending.current) return;
    extending.current = true;
    const seeds = radioSeeds(queue, index, RADIO_TRIES);
    void (async () => {
      try {
        for (const seed of seeds) {
          const res = await fetch(`/api/related/${seed.songId}`).catch(() => null);
          const items = res?.ok ? ((await res.json()) as QueueItem[]) : [];
          // 待っているあいだに別の並びに替わっていたら、足さない
          if (cursor.current.queue !== queue) return;
          const fresh = freshItems(queue, items);
          if (fresh.length > 0) {
            append(fresh);
            return;
          }
        }
      } finally {
        extending.current = false;
      }
    })();
  }, [owner, index, position, queue, append]);

  const close = useCallback(() => {
    clearResume();
    setResumable(false);
    resumeAt.current = null;
    sleepRef.current = null;
    setSleepState(null);
    setOwner(LOOSE);
    clearMore();
    clearTimeout(fadeTimer.current);
    clearTimeout(riseTimer.current);
    if (pauseFade.current) clearTimeout(pauseFade.current);
    pauseFade.current = null;
    letSleep();
    quiet.current = null;
    pausing.current = null;
    fading.current = false;
    pendingSwap.current = null;
    sounding.current = false;
    drop(player.current);
    player.current = null;
    drop(parked.current);
    parked.current = null;
    commit(EMPTY_CURSOR);
    setPlaying(false);
    setLoading(false);
  }, [clearMore, drop, commit, setOwner]);

  // 再生中は時刻を拾う。間は帯の側で補ってなめらかに進める
  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => {
      const p = player.current;
      if (p) setTime({ ...p.time(), at: performance.now() });
    }, TIMING.positionPoll);
    return () => clearInterval(id);
  }, [playing]);

  // 開いたときに、12時間以内に流していた前の曲があれば、止まった状態で戻す（player-resume.ts）。プレイヤーは作らない
  useEffect(() => {
    const saved = readResume();
    if (!saved) return;
    soundRef.current = savedVolume();
    setSound(soundRef.current);
    playbackRef.current = savedPlayback();
    setPlayback(playbackRef.current);
    commit(withOrder(saved.queue, saved.index, saved.order));
    setOwner(saved.owner);
    resumeAt.current = saved.position;
    setTime({ current: saved.position, duration: saved.duration, at: performance.now() });
    setResumable(true);
  }, [commit, setOwner]);

  /** 戻した前の曲を、聴いていた位置から流す（再生を押したとき） */
  const resume = useCallback(() => {
    const { queue: q, index: i } = cursor.current;
    if (!q[i]) return;
    const at = resumeAt.current;
    load(q, i, settledOwner(ownerRef.current, q[i]));
    // load は位置を 0 に戻すので、続きの位置を戻す（鳴り始めたところでそこへ飛ぶ）
    resumeAt.current = at;
  }, [load]);

  // 流しているあいだ、並びとどこまで聴いたかを残す。曲や並びが替わったときと、数秒ごと（時刻を拾うたび。SAVE_EVERY_MS で間引く）、
  // ページを離れるとき。戻したまま流していないあいだは、残したものをそのまま使う
  const lastSaved = useRef(0);
  const writeResume = useCallback(() => {
    const { queue: q, index: i } = cursor.current;
    if (q.length === 0) return;
    const t = player.current?.time();
    saveResume({
      queue: q,
      index: i,
      order: cursor.current.order,
      position: t?.current ?? 0,
      duration: t?.duration ?? 0,
      owner: settledOwner(ownerRef.current, q[i]),
    });
    lastSaved.current = performance.now();
  }, []);
  useEffect(() => {
    if (resumable || queue.length === 0) return;
    writeResume();
  }, [resumable, queue, index, owner, writeResume]);
  useEffect(() => {
    if (resumable || !playing) return;
    if (performance.now() - lastSaved.current > SAVE_EVERY_MS) writeResume();
  }, [time, resumable, playing, writeResume]);
  useEffect(() => {
    const onHide = () => {
      if (!resumable && cursor.current.queue.length > 0) writeResume();
    };
    window.addEventListener('pagehide', onHide);
    return () => window.removeEventListener('pagehide', onHide);
  }, [resumable, writeResume]);

  const current = queue[index] ?? null;
  useWakeLock(playing);
  // 閉じたあとも、帯が下へ消えきるまでは最後の曲を出しておく
  const [shown, setShown] = useState<QueueItem | null>(null);
  if (current && current !== shown) setShown(current);

  const value = useMemo<PlayerContext>(
    () => ({
      queue,
      index,
      current,
      playing,
      loading,
      owner,
      hasPrev: position > 0,
      // ループは全体か1曲なので、並びが2曲以上あれば最後の曲からも次へ進める
      hasNext: queue.length > 1,
      repeat: playback.repeat,
      shuffle: playback.shuffle,
      toggleRepeat,
      toggleShuffle,
      playQueue: (items, start, nextOwner, moving) => {
        clearMore();
        load(items, start, nextOwner);
        // 移る先の画面の置き場所ができるまで待つ（playAll の moving と同じ）。待たないと、移るまでの一瞬だけ右下の窓に出て、
        // 着いてから大きな置き場所へ移る動きが見えた
        if (moving) waitForSlot(waits());
      },
      takeOver,
      playAll,
      startRadio,
      playRadio,
      fillRadio,
      stopRadio,
      followProducer,
      // ループ（全体）なら、並びの最後のあとは先頭に戻って続くので、先頭からいまの曲の手前までも続けて並べる
      upcoming: () =>
        upcomingOf(
          cursor.current,
          playback.repeat === 'all' && owner.kind !== 'radio',
          UPCOMING_LIMIT,
        ),
      jumpTo: (i) => {
        const { queue: q } = cursor.current;
        if (q[i]) load(q, i, ownerRef.current);
      },
      resumable,
      resume,
      toggle: () => {
        if (resumable) {
          resume();
          return;
        }
        const p = player.current;
        // 絞っている途中にもう一度押されたら、止めるのをやめて音量を戻す
        if (pauseFade.current) {
          clearTimeout(pauseFade.current);
          pauseFade.current = null;
          if (p) rise(p);
          return;
        }
        if (playing) {
          // 鳴っている途中でいきなり止めると、波形が途切れてプツッと鳴る。曲の切り替えと同じく、絞りきってから止める。
          // 音量は 0 のまま残し、次に鳴り始めたら上げる（rise）。iPad・iPhone は埋め込みの音量を変えられないので絞らない
          const { volume, muted } = soundRef.current ?? sound;
          if (!p || !sounding.current || muted || volume === 0 || isAppleDevice()) {
            p?.pause();
            return;
          }
          clearTimeout(riseTimer.current);
          // 絞っているあいだに曲が替わったら（player.current が別のプレイヤー）、やめる
          fadeOut(p, volume, {
            timer: (t) => {
              pauseFade.current = t;
            },
            done: () => {
              pauseFade.current = null;
              quiet.current = p;
              p.pause();
            },
            keep: () => player.current === p,
            stop: () => {
              pauseFade.current = null;
            },
          });
          return;
        }
        if (p?.service === 'niconico') primeParked(cursor.current.queue);
        p?.play();
      },
      step,
      close,
      seek: (seconds) => {
        if (resumable) resumeAt.current = seconds;
        player.current?.seek(seconds);
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
        // 絞りきったまま次の曲を待っているあいだに動かされたら、鳴り始めてから上げ直さない
        quiet.current = null;
        clearTimeout(riseTimer.current);
        player.current?.setVolume(volume);
        player.current?.setMuted(false);
      },
      toggleMute: () => {
        const now = soundRef.current ?? sound;
        const next = { ...now, muted: !now.muted };
        soundRef.current = next;
        setSound(next);
        saveVolume(next.volume, next.muted);
        player.current?.setMuted(next.muted);
      },
      setSlot,
      holdSlot,
      holdingSlot,
      sleep,
      preload,
      skipsNiconico,
      setSleep,
    }),
    [
      rise,
      resumable,
      resume,
      waitForSlot,
      waits,
      queue,
      index,
      current,
      playing,
      loading,
      owner,
      position,
      playback,
      toggleRepeat,
      toggleShuffle,
      load,
      playAll,
      clearMore,
      startRadio,
      playRadio,
      fillRadio,
      stopRadio,
      followProducer,
      takeOver,
      step,
      close,
      time,
      sound,
      setSlot,
      holdSlot,
      holdingSlot,
      sleep,
      preload,
      skipsNiconico,
      setSleep,
      primeParked,
    ],
  );

  return (
    <Context value={value}>
      {children}
      <DockStrip mode={mode} shown={shown} owner={owner} onClose={close} />
      {/* プレイヤーの上には何も重ねない（YouTube の規約）。200×200 を下回らない */}
      <div
        ref={frame}
        // E2E テストや確かめのときに、プレイヤーの枠を見つける目印
        data-player-frame
        className={`${
          mode === 'slot'
            ? 'fixed z-raised overflow-hidden bg-black md:rounded-2xl [&_iframe]:size-full'
            : `chrome-bottom ${DOCK} ${FADE} z-chrome overflow-hidden rounded-b-2xl bg-black shadow-dock ring-1 ring-line/60 dark:shadow-dock-dark [&_iframe]:size-full ${mode === 'none' ? HIDDEN : ''}`
        } ${resumable ? 'invisible' : ''}`}
      />
      {/* 戻した前の曲をまだ流していないあいだ、右下の窓の場所に、その曲の表紙と再生ボタンを出す（動画の枠は隠している）。
          持ち主の画面では、その画面の大きな動画の場所に出す（player-stage.tsx） */}
      {resumable && mode === 'dock' && current && (
        <button
          type="button"
          onClick={resume}
          aria-label={`「${current.title}」の続きを再生`}
          className={`chrome-bottom ${DOCK} group z-chrome overflow-hidden rounded-b-2xl bg-black shadow-dock ring-1 ring-line/60 dark:shadow-dock-dark`}
        >
          <FadeImage
            src={current.thumb}
            alt=""
            fill
            sizes={`${IMAGE_SIZES.dockWide}px`}
            className="object-cover"
          />
          <span className={`absolute top-1/2 left-1/2 size-14 -translate-1/2 ${COVER_PLAY}`}>
            <Icon name="play" className="size-8" />
          </span>
        </button>
      )}
      {/* 置き場所を待つあいだもプレイヤーの帯は出す（流し始めたことが分かるように） */}
      <PlayerBar item={shown} open={queue.length > 0} />
      <PlayerKeys />
    </Context>
  );
}
