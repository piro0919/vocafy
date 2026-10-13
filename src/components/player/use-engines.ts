import { type RefObject, useCallback, useEffect, useRef } from 'react';
import { isAppleDevice } from '@/lib/apple-device';
import type { QueueItem } from '@/lib/catalog';
import type { Engine, EngineEvents, Sound } from './engine';
import { FADE_OUT_MS, FADE_STEPS, fadeOut, PAUSE_WAIT_MS } from './fade';
import { createNiconicoEngine } from './niconico';
import { createNiconicoPool, type NiconicoPool, type Preloaded } from './niconico-pool';
import { savedVolume } from './player-storage';
import { createYouTubeEngine } from './youtube';

const DEFAULT_SOUND: Sound = { volume: 100, muted: false };
/** 流し始める位置を持たないとき */
const NO_START = (): number | undefined => undefined;
/** 隠している YouTube のプレイヤーの入れ物（park）。枠（fixed）いっぱいに重ね、見えなくして押せなくする */
const PARKED = ['invisible', 'absolute', 'inset-0', 'pointer-events-none'];

/**
 * 動画を流すプレイヤー（engine.ts）の持ち方と、音の切り替え。player-provider.tsx から分けた（2026-10-12）。
 * provider は並びと画面の状態を持ち、こちらはプレイヤーを作る・使い回す・隠す・壊すことと、音量を絞ってから
 * 曲を替える・止めることを受け持つ。
 *
 * - プレイヤーは枠（frameRef）の中に、プレイヤーごとの入れ物（div）を足して置く。知らせは、いま流しているプレイヤーのものだけ
 *   handlersRef に渡す
 * - ニコニコの曲のあいだ、YouTube のプレイヤーは壊さず止めて隠す（parked）。iPad の Safari は一度押して流れたプレイヤーなら
 *   自動で流すので、作り直すと次の YouTube の曲が止められる
 * - 鳴っている途中の音をいきなり切ると、波形が途切れてプツッと鳴る。曲を替えるときも一時停止するときも、絞りきってから切る。
 *   iPad・iPhone は絞らない（埋め込みの音量を Web から変えられず、切り替えが押した操作の外へずれて止められる）
 *
 * iPad・iPhone の Safari の、押す操作の無い再生を止める決まりへの回避策は、すべてここにある（2026-10-12 にまとめた）。互いに前提にし合うので、
 * 1つを変えるときはほかの2つも読む
 * 1. 開いたときに、空の YouTube のプレイヤーを作っておく（prewarm の effect）。押した操作の中で動画を頼めるので、1曲目が止められない
 * 2. ニコニコの曲のあいだ、YouTube のプレイヤーを壊さず隠す（parked）。作り直すと次の YouTube の曲が止められる。
 *    隠したプレイヤーに、押した操作の中で音を消して一度流しておく（primeParked）。一度押して流れたプレイヤーなら、あとの曲も自動で流れる。
 *    1 で作ったプレイヤーも、ここで隠すプレイヤーとして扱う
 * 3. 画面に見えているニコニコの曲の埋め込みを、隠して先に読み込んでおく（preload・niconico-pool.ts）。押された曲の埋め込みが読み込み済みなら、
 *    押した操作の中で play を送れるので、1回で流れる。曲を替える（switchTo）ときに受け取る
 * どれも Mac の WebKit では一部しか再現できず、実機での確かめが要る（CLAUDE.md の「分かっている問題」）
 */
export function useEngines(
  frameRef: RefObject<HTMLDivElement | null>,
  soundRef: RefObject<Sound | null>,
  handlersRef: RefObject<EngineEvents>,
  /** いま流している動画。その曲は先に読み込まない（niconico-pool.ts） */
  playingVideo: () => string | undefined,
  /** その動画を流し始める位置（秒）。開き直して戻した曲の続きの位置で、ニコニコの埋め込みの先読みに付ける */
  startOf: (videoId: string) => number | undefined = NO_START,
) {
  const player = useRef<Engine | null>(null);
  // ニコニコの曲を流すあいだ、止めて隠しておく YouTube のプレイヤー。プレイヤーごとの入れ物（枠の中の div）
  const parked = useRef<Engine | null>(null);
  const boxes = useRef(new WeakMap<Engine, HTMLElement>());
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
  // 一時停止の前に音量を絞っている途中なら、その時計
  const pauseFade = useRef<ReturnType<typeof setTimeout> | null>(null);
  // 曲を替えている途中（まだ鳴り始めていない）に一時停止が押されたか。次の曲が鳴り始めたら、すぐ止める。
  // 読み込みの途中で止めても、読み込み終わると流れ始めて、押した一時停止が消えた（2026-10-13）
  const held = useRef(false);

  /**
   * YouTube のプレイヤーの入れ物を隠す・出す（parked）。display: none（hidden）にせず、場所を取らない見えない形にする。
   * iPhone の Safari は display: none の入れ物の動画を押した操作の中でも音ありで流させず、許し付け（prime）が効かずに、
   * ニコニコの曲を押して始めた並びのあとの YouTube の曲が止められた（2026-10-13 に本人の iPhone で確かめた）
   */
  const park = useCallback((engine: Engine, parking: boolean) => {
    const box = boxes.current.get(engine);
    for (const name of PARKED) box?.classList.toggle(name, parking);
  }, []);

  /** プレイヤーを壊し、入れ物も外す */
  const drop = useCallback((engine: Engine | null) => {
    if (!engine) return;
    engine.destroy();
    boxes.current.get(engine)?.remove();
  }, []);

  /** 絞りきったプレイヤーの消音を解き、音量を絞ったときと同じ速さで、いまの音量まで上げる。上げる先は一刻みごとに読み直す */
  const rise = useCallback(
    (engine: Engine) => {
      quiet.current = null;
      clearTimeout(riseTimer.current);
      engine.setVolume(0);
      engine.setMuted(soundRef.current?.muted ?? false);
      let step = 0;
      const tick = () => {
        if (player.current !== engine || quiet.current) return;
        step += 1;
        const { volume } = soundRef.current ?? DEFAULT_SOUND;
        engine.setVolume(Math.round((volume * step) / FADE_STEPS));
        if (step < FADE_STEPS) riseTimer.current = setTimeout(tick, FADE_OUT_MS / FADE_STEPS);
      };
      tick();
    },
    [soundRef],
  );

  /**
   * プレイヤーを作り、枠の中に自分の入れ物（div）を足して置く。知らせは、いま流しているプレイヤー（player.current）のものだけ拾う
   */
  const spawn = useCallback(
    (
      service: QueueItem['service'],
      videoId: string,
      sound: Sound,
      preloaded?: Preloaded,
      /** ニコニコの曲を流し始める位置（秒）。開き直して前の曲の続きから流すとき */
      startAt?: number,
    ): Engine | null => {
      if (!frameRef.current) return null;
      // 隠しているプレイヤーの知らせは拾わない（止めたときの一時停止が、流しているニコニコの曲の表示を変えないように）
      let engine: Engine | null = null;
      const live =
        <A extends unknown[]>(f: (...args: A) => void) =>
        (...args: A) => {
          if (player.current === engine) f(...args);
        };
      const events: EngineEvents = {
        onPlaying: live(() => {
          if (pausing.current === engine) pausing.current = null;
          // 替えている途中に一時停止が押されていたら、鳴らさずに止める。音は絞ったままにし、再生を押したら上げる（rise）
          if (held.current && engine) {
            engine.setMuted(true);
            quiet.current = engine;
            engine.pause();
            return;
          }
          sounding.current = true;
          if (quiet.current && quiet.current === engine) rise(engine);
          handlersRef.current.onPlaying();
        }),
        // 再生の開始をブラウザに止められたときも届く
        onPaused: live(() => {
          if (pausing.current === engine) return;
          sounding.current = false;
          handlersRef.current.onPaused();
        }),
        onEnded: live(() => {
          sounding.current = false;
          handlersRef.current.onEnded();
        }),
        onBlocked: live(() => {
          sounding.current = false;
          handlersRef.current.onBlocked();
        }),
        onError: live((failure) => {
          sounding.current = false;
          handlersRef.current.onError(failure);
        }),
      };
      // 先に読み込んでおいた埋め込みは、その入れ物ごと表に出して使う
      let box: HTMLElement;
      if (preloaded) {
        box = preloaded.box;
        box.hidden = false;
        engine = createNiconicoEngine(box, videoId, sound, events, preloaded, startAt);
      } else {
        box = document.createElement('div');
        box.className = 'size-full';
        frameRef.current.append(box);
        engine =
          service === 'niconico'
            ? createNiconicoEngine(box, videoId, sound, events, undefined, startAt)
            : createYouTubeEngine(box, videoId, sound, events);
      }
      boxes.current.set(engine, box);
      return engine;
    },
    [frameRef, handlersRef, rise],
  );

  // iPad・iPhone では、YouTube のプレイヤーを曲を押す前に作っておく（動画は入れない）。押す前から用意できていれば、
  // 押した操作の中で動画を頼めるので、Safari に1曲目を止められない。作るのを押してからにすると、仕組みの読み込みを
  // 待つあいだに押した操作の続きとみなされなくなる。ほかの端末は止められないので、開いただけで YouTube を読み込ませない
  useEffect(() => {
    if (!isAppleDevice() || player.current || parked.current) return;
    const engine = spawn('youtube', '', savedVolume());
    if (!engine) return;
    park(engine, true);
    parked.current = engine;
  }, [spawn, park]);

  // 3. 見えているニコニコの曲の埋め込みの先読み。曲の行の部品は先に作られて頼んでくるので、初めて頼まれたときに作る。ほかの端末では作らない
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
      // 流している曲は先に読み込まない。プレイヤーが無いあいだ（開き直して前の曲を戻しただけで、まだ流していない）は、
      // その曲も読み込む。外していたら、戻した曲を押したときに埋め込みが無く、1回で流れなかった（2026-10-13）
      if (!pool.current && isAppleDevice())
        pool.current = createNiconicoPool(
          () => frameRef.current,
          () => (player.current ? playingVideo() : undefined),
          startOf,
        );
      return pool.current?.want(videoId) ?? (() => {});
    },
    [frameRef, playingVideo, startOf],
  );

  /** 隠している YouTube のプレイヤーに、押した操作の中で許しを付けておく（engine.ts の prime）。並びに YouTube の曲が無ければ要らない */
  const primeParked = useCallback((items: QueueItem[]) => {
    const youtube = items.find((s) => s.service === 'youtube');
    if (youtube) parked.current?.prime?.(youtube.videoId);
  }, []);

  /**
   * その動画を流す。同じ仕組みの曲が続くなら、プレイヤーを使い回して動画だけ替える。先に読み込んでおいたニコニコの埋め込みが
   * あれば、いまのプレイヤーを使い回さずにそれで流す
   */
  const swapTo = useCallback(
    (service: QueueItem['service'], videoId: string, startAt?: number) => {
      // 先に読み込んでおいたニコニコの埋め込みがあれば受け取る（3）
      const preloaded =
        service === 'niconico' ? (pool.current?.take(videoId) ?? undefined) : undefined;
      // 音量はいまの値を読む。絞っているあいだにつまみを動かされたら、動かしたあとの音量で始める
      // 替えている途中に一時停止が押されていたら、消音して始める（鳴り始めたらすぐ止めるが、それまでの出だしも鳴らさない）
      const given = soundRef.current ?? DEFAULT_SOUND;
      const now = held.current ? { ...given, muted: true } : given;
      // 絞って替えたときは、消音と音量を戻すのは次の曲が鳴り始めてから（onPlaying の rise）。頼んだ直後に戻すと、
      // 止めた前の曲の残りか次の曲の出だしがいきなり元の音量で鳴り、プツッと聞こえた
      if (player.current?.service === service && !preloaded) {
        player.current.load(videoId);
        if (quiet.current !== player.current) player.current.setVolume(now.volume);
        return;
      }
      quiet.current = null;
      pausing.current = null;
      // YouTube からニコニコに替えるときは、YouTube のプレイヤーを壊さず、止めて隠しておく
      const leaving = player.current;
      player.current = null;
      if (leaving?.service === 'youtube') {
        leaving.pause();
        park(leaving, true);
        parked.current = leaving;
      } else drop(leaving);
      if (service === 'youtube' && parked.current) {
        const kept = parked.current;
        parked.current = null;
        park(kept, false);
        player.current = kept;
        kept.setMuted(now.muted);
        kept.setVolume(now.volume);
        kept.load(videoId);
        return;
      }
      player.current = spawn(service, videoId, now, preloaded, startAt);
    },
    [soundRef, drop, spawn, park],
  );
  const switchTo = useCallback(
    (service: QueueItem['service'], videoId: string, startAt?: number) => {
      swapTo(service, videoId, startAt);
      // 前に受け取った埋め込みの曲がまだ見えていれば、次に押されたときのために読み込み直す（3）
      pool.current?.refresh();
    },
    [swapTo],
  );

  /** 一時停止の前に絞っている途中なら、やめる（曲を替えるとき。同じプレイヤーで次の曲を流すので、そのままだと次の曲が止まる） */
  const stopPauseFade = useCallback(() => {
    if (pauseFade.current) clearTimeout(pauseFade.current);
    pauseFade.current = null;
  }, []);

  /**
   * 曲を替える。鳴っている途中なら、音量を絞りきってから swap を呼ぶ。絞っているあいだに別の曲が選ばれたら、
   * 絞り終わったときに最後の曲へ替える
   */
  const change = useCallback(
    (swap: () => void) => {
      const sound = soundRef.current ?? DEFAULT_SOUND;
      // 別の曲が選ばれたら、その曲は流す
      held.current = false;
      pendingSwap.current = swap;
      if (fading.current) return;
      const current = player.current;
      if (!current || !sounding.current || sound.muted || sound.volume === 0 || isAppleDevice()) {
        pendingSwap.current = null;
        // 次の曲はまだ鳴っていない。下ろさずにいると、iPad・iPhone（絞らずにすぐ替える）で、読み込み中に押した一時停止が
        // 前の曲が鳴っているものとして扱われ、次の曲が流れ始めた（held が立たなかった。2026-10-13 に iPhone で確かめた）
        sounding.current = false;
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
    [soundRef],
  );

  /**
   * 一時停止する。曲の切り替えと同じく、絞りきってから止める。音量は 0 のまま残し、次に鳴り始めたら上げる（rise）。
   * 絞っている途中にもう一度呼ばれたら、止めるのをやめて音量を戻す
   */
  const pause = useCallback(() => {
    const p = player.current;
    if (pauseFade.current) {
      clearTimeout(pauseFade.current);
      pauseFade.current = null;
      if (p) rise(p);
      return;
    }
    // 曲を替えている途中（まだ鳴り始めていない）なら、鳴り始めたときに止める印を立て、表示はすぐ一時停止にする。
    // 前の曲を絞っている途中なら、絞りきるまでは任せる（途中で消音すると、プツッと鳴る）
    if (!sounding.current) {
      held.current = true;
      if (p && !fading.current) {
        p.setMuted(true);
        quiet.current = p;
        p.pause();
      }
      handlersRef.current.onPaused();
      return;
    }
    const { volume, muted } = soundRef.current ?? DEFAULT_SOUND;
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
  }, [soundRef, rise, handlersRef]);

  /** 流す。替えている途中に押された一時停止（held）も取り消す */
  const play = useCallback(() => {
    held.current = false;
    player.current?.play();
  }, []);

  /** 一時停止の前に絞っている途中か。途中で押し直したら、止めるのをやめる（pause） */
  const pausingSoftly = useCallback(() => pauseFade.current !== null, []);

  /** つまみを動かした。絞りきったまま次の曲を待っているあいだなら、鳴り始めてから上げ直さない */
  const setVolume = useCallback((volume: number) => {
    quiet.current = null;
    clearTimeout(riseTimer.current);
    player.current?.setVolume(volume);
    player.current?.setMuted(false);
  }, []);

  /** プレイヤーをすべて壊し、絞っている途中の時計も止める（プレイヤーを閉じたとき） */
  const reset = useCallback(() => {
    clearTimeout(fadeTimer.current);
    clearTimeout(riseTimer.current);
    if (pauseFade.current) clearTimeout(pauseFade.current);
    pauseFade.current = null;
    held.current = false;
    quiet.current = null;
    pausing.current = null;
    fading.current = false;
    pendingSwap.current = null;
    sounding.current = false;
    drop(player.current);
    player.current = null;
    drop(parked.current);
    parked.current = null;
  }, [drop]);

  return {
    player,
    preload,
    primeParked,
    switchTo,
    stopPauseFade,
    change,
    pause,
    play,
    pausingSoftly,
    setVolume,
    reset,
  };
}
