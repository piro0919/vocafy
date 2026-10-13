'use client';

import { useSongTitle } from '@/components/display-names';
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { toast } from 'sonner';
import { keepAwake, letSleep, rest } from './keep-awake';
import type { QueueItem } from '@/lib/catalog';
import { PlayerBar } from './player-bar';
import type { EngineEvents, Sound } from './engine';
import { PlayerKeys } from './player-keys';
import { useWakeLock } from './use-wake-lock';
import { DOCK, DockStrip, FADE, HIDDEN } from './dock-strip';
import { clearResume, readResume } from './player-resume';
import { CoverPlayButton, RESUME_TEXT } from '../cover-play-button';
import {
  appendItems,
  type Cursor,
  EMPTY_CURSOR,
  moveTo,
  restart,
  stepFrom,
  upcomingOf,
  withOrder,
} from './queue-state';
import { savedPlayback, savedVolume, savePlayback, saveVolume } from './player-storage';
import type { Owner, PlaybackTime, PlayerContext, QueueOwner, Repeat } from './player-types';
import {
  afterEnded,
  type BeforeRadio,
  radioExit,
  LOOSE,
  PENDING,
  settledOwner,
  skipsAutoNiconico,
} from './player-rules';
import { useEngines } from './use-engines';
import { withPv } from './pv-choice';
import { useFrameLayout } from './use-frame-layout';
import { useRadioExtension } from './use-radio-extension';
import { useResumeWriter } from './use-resume-writer';
import { useSleepTimer } from './use-sleep-timer';
import { useSlot } from './use-slot';
import { createTapWatch, trail } from './watch';
import { IMAGE_SIZES } from '@/lib/image-sizes';
import { TIMING } from '@/lib/timing';
import { useClientValue } from '@/lib/client-value';
import { useMirroredState } from '@/lib/use-mirrored-state';
import { defineText } from '@/i18n/text';
import { useText } from '@/i18n/navigation';

const TEXT = defineText({
  ja: {
    skipped: (title: string) => `${title}をスキップしました`,
  },
  en: {
    skipped: (title: string) => `Skipped ${title}`,
  },
});

export type { Owner, PlaybackTime, Sleep } from './player-types';

const Context = createContext<PlayerContext | null>(null);

export function usePlayer(): PlayerContext {
  const ctx = useContext(Context);
  if (!ctx) throw new Error('usePlayer は PlayerProvider の内側で使う');
  return ctx;
}

/**
 * 再生位置（0.5 秒おきに拾う）。usePlayer とは別に配る。同じ入れ物に入れていたころは、流しているあいだ 0.5 秒ごとに
 * usePlayer を読む部品がすべて描き直され、曲の行の一覧（ボカロPの画面では数百行）まで1秒に2回描き直していた。
 * 読むのは再生の帯・背景の色・キーボード操作だけ
 */
const TimeContext = createContext<PlaybackTime>({ current: 0, duration: 0, at: 0 });

export function usePlaybackTime(): PlaybackTime {
  return useContext(TimeContext);
}

/**
 * 次に流れる曲として見せる数。並び全体は開いている画面の一覧に出ているので、板は次に来る曲を見るだけにする
 * （100曲まで出していたら多すぎると言われた）
 */
const UPCOMING_LIMIT = 10;

/** 音量とループ・ランダムを読む前に出す既定の値 */
const DEFAULT_SOUND: Sound = { volume: 100, muted: false };
type Playback = { repeat: Repeat; shuffle: boolean };
const DEFAULT_PLAYBACK: Playback = { repeat: 'all', shuffle: false };

/** プレイヤーの知らせの、中身を入れる前の形 */
const NO_EVENTS: EngineEvents = {
  onPlaying: () => {},
  onPaused: () => {},
  onEnded: () => {},
  onBlocked: () => {},
  onError: () => {},
};

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

/** 開発用: ?mock-niconico-blocked で、ニコニコの曲が止められたあと（iPad の Safari）の状態から始める */
function mockNiconicoBlocked(): boolean {
  return (
    process.env.NODE_ENV === 'development' &&
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).has('mock-niconico-blocked')
  );
}

export function PlayerProvider({ children }: { children: ReactNode }) {
  const t = useText(TEXT);
  const songTitle = useSongTitle();
  const resumeText = useText(RESUME_TEXT);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  // 並びの持ち主（player-types.ts）。曲送り（プレイヤーの知らせから呼ばれる）でも引き継ぐので、ref にも持つ
  const [owner, ownerRef, setOwner] = useMirroredState<Owner>(LOOSE);
  const [time, setTime] = useState<PlaybackTime>({ current: 0, duration: 0, at: 0 });
  // 開き直したときに戻した、まだ流していない前の曲（player-resume.ts）。プレイヤーはまだ作っておらず、再生を押すと続きから流す。
  // resumeAt は続きの位置（秒）で、再生を押したときにプレイヤーに渡す（startFrom）
  const [resumable, setResumable] = useState(false);
  const resumeAt = useRef<number | null>(null);
  // 続きの位置は、鳴り始めてから飛ばず、流し始める前にプレイヤーに渡す（niconico.ts の startAt、youtube.ts の startSeconds）。resume が立てて下ろす。
  // YouTube の曲も鳴り始めてから飛んでいたころは、押した直後に曲の頭が1秒ほど鳴ってから続きへ飛んだ（2026-10-14、Android の Chrome で）
  const startFrom = useRef<number | null>(null);
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
  /** 移る先の画面の置き場所ができるまで、右下の窓を出さずに待つ（右下の窓がもう出ているなら待たない） */
  const awaitSlot = useCallback(() => waitForSlot(waits()), [waitForSlot, waits]);
  // プレイヤーの枠。置き場所か右下の窓に合わせ続ける（use-frame-layout.ts）
  const frame = useFrameLayout(mode, slot);
  // 残しておいた音量は、最初に曲を流したときに読む（サーバーでは localStorage を読めず、帯も曲を流すまで出ない）
  // まだ読んでいなければ null（画面には既定の値を出す）
  const [savedSound, soundRef, setSound] = useMirroredState<Sound | null>(null);
  const sound = savedSound ?? DEFAULT_SOUND;
  // ループとランダム。音量と同じく、最初に曲を流したときに読む
  const [savedPlaybackState, playbackRef, setPlayback] = useMirroredState<Playback | null>(null);
  const playback = savedPlaybackState ?? DEFAULT_PLAYBACK;
  /** 残しておいた音量・ループ・ランダムを読む。最初に曲を流すときに1回だけ（前の曲を戻すときは、開いたときの effect で読む） */
  const loadSettings = useCallback(() => {
    if (!soundRef.current) setSound(savedVolume());
    if (!playbackRef.current) setPlayback(savedPlayback());
  }, [soundRef, playbackRef, setSound, setPlayback]);
  const [position, setPosition] = useState(0);
  // 並びと流す順（queue-state.ts）。プレイヤーの知らせは作ったときの関数を持ち続けるので、state と別に ref にも持つ
  const cursor = useRef<Cursor>(EMPTY_CURSOR);
  const commit = useCallback((next: Cursor) => {
    cursor.current = next;
    setQueue(next.queue);
    setIndex(next.index);
    setPosition(next.position);
  }, []);

  // いま流している動画（use-engines.ts の先読みが、その曲を読み込まないように見る）。描くたびに作り直すと、
  // 先読みを頼む関数（preload）まで描くたびに変わり、曲の行の見張りがやり直しになるので、変わらない関数にする
  const playingVideo = useCallback(() => cursor.current.queue[cursor.current.index]?.videoId, []);
  // 開き直して戻した曲の続きの位置。ニコニコの埋め込みを先読みするときに住所に付ける（niconico-pool.ts）
  const resumeStart = useCallback(
    (videoId: string) =>
      resumeAt.current !== null && playingVideo() === videoId ? resumeAt.current : undefined,
    [playingVideo],
  );
  // プレイヤーの知らせ（use-engines.ts が、いま流しているプレイヤーのものだけ渡す）。中身は下で、使う関数ができてから入れる
  const handlers = useRef<EngineEvents>(NO_EVENTS);
  const {
    player: playerRef,
    primeParked,
    switchTo,
    stopPauseFade,
    change,
    pause: softPause,
    play: playEngine,
    preload,
    pausingSoftly,
    setVolume: setEngineVolume,
    reset: resetEngines,
  } = useEngines(frame, soundRef, handlers, playingVideo, resumeStart);
  // 曲が終わったときの処理。load から自分自身を呼ぶことになるので、ref を通して呼ぶ
  const onEnded = useRef(() => {});
  // 前後の曲へ進む（next）。load から呼ぶので、next より先に置く
  const nextRef = useRef<(dir: 1 | -1) => void>(() => {});
  // 曲が終わって自動で次へ進むところか。load が読んで下ろす。いま流している曲が自動で進んだ先か（auto）も持つ
  const autoNext = useRef(false);
  const auto = useRef(false);
  // 押したのに鳴らなかったことを Sentry に知らせる（watch.ts）
  const [watch] = useState(createTapWatch);
  // ニコニコの曲は、iPad の Safari では自動で進んだ先だと必ず止められる（曲ごとに埋め込みを作り直すので、押した記録が残らない）。
  // 一度止められたら、このタブでは自動で進む先のニコニコの曲を読み込まずに飛ばす。自分で押した曲は ▶ で流せるので飛ばさない。
  // 並びがニコニコの曲だけのときに回り続けないよう、続けて飛ばした数（skipped）が並びの数に届いたら止まる
  const niconicoBlocked = useRef(mockNiconicoBlocked());
  const skipped = useRef(0);
  // 自動で進む先のニコニコの曲を飛ばしているか（画面に出す。次に流れる曲の板で薄くする）。最初に飛ばしたときだけ知らせる
  const [skipping, setSkipsNiconico] = useState(false);
  // 開発用の切り替えは、サーバーで描いた形と食い違わないよう、ページの準備ができてから効かせる
  const mocked = useClientValue(mockNiconicoBlocked, false);
  const skipsNiconico = skipping || mocked;
  const skipNoticed = useRef(false);
  const noteSkip = useCallback(
    (item: QueueItem | undefined) => {
      niconicoBlocked.current = true;
      setSkipsNiconico(true);
      if (skipNoticed.current || !item) return;
      skipNoticed.current = true;
      toast(t.skipped(songTitle(item).main));
    },
    [t, songTitle],
  );

  /** 自動で進んだ先のニコニコの曲を飛ばして、次の曲へ自動で進む */
  const skipAhead = useCallback(
    (item: QueueItem | undefined) => {
      noteSkip(item);
      skipped.current += 1;
      autoNext.current = true;
      nextRef.current(1);
    },
    [noteSkip],
  );

  useEffect(() => {
    handlers.current = {
      onPlaying: () => {
        watch.sounded();
        trail('playing');
        setPlaying(true);
        setLoading(false);
      },
      // 再生の開始をブラウザに止められたときも届く。読み込み中のままにせず、再生ボタンを出す
      onPaused: () => {
        trail('paused');
        setPlaying(false);
        setLoading(false);
      },
      onEnded: () => onEnded.current(),
      // 自動で進んだ先のニコニコの曲なら飛ばして次へ。それ以外は一時停止として扱い、再生ボタンを出す
      onBlocked: () => {
        setLoading(false);
        const { queue: q, index: i } = cursor.current;
        if (q[i]) watch.blocked(q[i].service, q[i].videoId, auto.current);
        const skip = skipsAutoNiconico(q[i], {
          auto: auto.current,
          blocked: true,
          skipped: skipped.current,
          length: q.length,
        });
        if (skip) {
          skipAhead(q[i]);
          return;
        }
        setPlaying(false);
      },
      // 再生できない動画（削除・非公開・埋め込み不可・有料会員限定など）は、読み込み中のまま止めず、次の曲へ進む
      onError: (failure) => {
        const { queue: q, index: i } = cursor.current;
        if (q[i]) watch.failed(q[i].service, q[i].videoId, failure.detail, failure.unplayable);
        setLoading(false);
        onEnded.current();
      },
    };
  }, [skipAhead, playerRef, watch]);

  const load = useCallback(
    (given: QueueItem[], at: number, nextOwner: Owner) => {
      const items = withPv(given);
      keepAwake();
      setResumable(false);
      // 戻した前の曲を流さずに別の曲を押したとき、その曲が前の曲の続きの位置から始まらないように消す（続きから流すときは resume が戻す）
      resumeAt.current = null;
      stopPauseFade();
      auto.current = autoNext.current;
      autoNext.current = false;
      setOwner(nextOwner);
      waitForSlot(nextOwner.kind === 'pending' && waits());
      loadSettings();
      // 新しい並びなら流す順を作り直す。同じ並びの中で曲を移るだけなら、流す順はそのまま
      commit(moveTo(cursor.current, items, at, playbackRef.current?.shuffle ?? false));
      setLoading(true);
      setTime({ current: 0, duration: 0, at: performance.now() });
      const { service, videoId } = items[at];
      watch.requested(service, videoId, auto.current);
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
        skipAhead(items[at]);
        return;
      }
      // 音量を絞りきってから替える（use-engines.ts）。先に読み込んでおいたニコニコの埋め込みは、替えるときに受け取る
      // 開き直して戻した曲は、続きの位置をプレイヤーに渡す（resume）
      const startAt = startFrom.current ?? undefined;
      change(() => switchTo(service, videoId, startAt));
    },
    [
      waitForSlot,
      waits,
      stopPauseFade,
      change,
      switchTo,
      primeParked,
      skipAhead,
      commit,
      setOwner,
      loadSettings,
      playbackRef,
      watch,
    ],
  );

  /** 一覧の続きのページやラジオの関連曲を後ろに足す。いまの曲と流す順はそのままで、足した曲を流す順の後ろに付ける */
  const append = useCallback(
    (items: QueueItem[]) =>
      commit(appendItems(cursor.current, withPv(items), playbackRef.current?.shuffle ?? false)),
    [commit, playbackRef],
  );

  /**
   * 流す順で前後の曲へ。ループは全体なので、最後の曲の次は先頭へ戻る。
   * ランダムのときは、ひと回りしたら混ぜ直す（同じ順の繰り返しにしない）
   */
  const next = useCallback(
    (dir: 1 | -1) => {
      const step = stepFrom(cursor.current, dir, playbackRef.current?.shuffle ?? false);
      if (step.kind === 'stay') return;
      // 流す順を作り直したとき（最後の曲の次）は、それを入れてから流す。load は同じ並びなら流す順をそのまま使う
      cursor.current = { ...cursor.current, order: step.order };
      load(cursor.current.queue, step.index, ownerRef.current);
    },
    [load, ownerRef, playbackRef],
  );
  const step = next;
  useEffect(() => {
    nextRef.current = next;
  }, [next]);

  // スリープタイマー（use-sleep-timer.ts）
  const { sleep, sleepRef, setSleep } = useSleepTimer(playerRef, soundRef);

  useEffect(() => {
    // 曲が終わったら、ループが1曲なら頭から、そうでなければ流す順の次の曲へ（最後なら先頭に戻る）
    onEnded.current = () => {
      // スリープタイマーが「この曲が終わったら」なら、次へ進まずに止める（曲は終わったところで止まっている）
      const action = afterEnded(sleepRef.current, playbackRef.current?.repeat);
      if (action === 'stop') {
        setSleep(null);
        // 曲が終わったときは「止まった」の知らせが来ないので、流していない表示にここで切り替える
        setPlaying(false);
        return;
      }
      if (action === 'repeat' && playerRef.current) {
        playerRef.current.seek(0);
        playEngine();
        return;
      }
      autoNext.current = true;
      next(1);
    };
  }, [next, setSleep, sleepRef, playerRef, playbackRef, playEngine]);

  const toggleShuffle = useCallback(() => {
    const now = playbackRef.current ?? savedPlayback();
    const value = { ...now, shuffle: !now.shuffle };
    setPlayback(value);
    savePlayback(value);
    // いまの曲を起点に、流す順を作り直す
    commit(restart(cursor.current.queue, cursor.current.index, value.shuffle));
  }, [commit, playbackRef, setPlayback]);

  const toggleRepeat = useCallback(() => {
    const now = playbackRef.current ?? savedPlayback();
    const value = { ...now, repeat: now.repeat === 'all' ? ('one' as const) : ('all' as const) };
    setPlayback(value);
    savePlayback(value);
  }, [playbackRef, setPlayback]);

  const adopt = useCallback(
    (items: QueueItem[], at: number, nextOwner: Owner) => {
      commit(restart(withPv(items), at, playbackRef.current?.shuffle ?? false));
      setOwner(nextOwner);
    },
    [commit, setOwner, playbackRef],
  );

  const playAll = useCallback(
    (
      items: QueueItem[],
      source: string,
      { at = 0, moving = false }: { at?: number; moving?: boolean } = {},
    ) => {
      load(items, at, { kind: 'list', source });
      if (moving) {
        // 一覧の再生用の画面へ移る途中。曲の一覧から押してボカロPの画面へ移るとき（pending）と同じく、置き場所を待つ
        awaitSlot();
      }
    },
    [load, awaitSlot],
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
    };
  }, [ownerRef]);

  const startRadio = useCallback(
    (seed: QueueItem) => {
      rememberBeforeRadio();
      const radio: Owner = { kind: 'radio', home: `/radio/${seed.songId}` };
      const { queue: q, index: i } = cursor.current;
      // ラジオの画面へ移る途中。一覧の再生用の画面へ移るとき（playAll の moving）と同じく、置き場所を待つ（waitForSlot）
      if (q[i]?.songId !== seed.songId) {
        load([seed], 0, radio);
        awaitSlot();
        return;
      }
      commit(restart([seed], 0, false));
      setOwner(radio);
      awaitSlot();
    },
    [load, rememberBeforeRadio, commit, setOwner, awaitSlot],
  );

  const playRadio = useCallback(
    (items: QueueItem[], at: number) => {
      if (items.length === 0) return;
      rememberBeforeRadio();
      load(items, at, { kind: 'radio', home: `/radio/${items[0].songId}` });
    },
    [load, rememberBeforeRadio],
  );

  const fillRadio = useCallback(
    (items: QueueItem[]) => {
      const { queue: q } = cursor.current;
      if (ownerRef.current.kind !== 'radio' || q.length !== 1 || items[0]?.songId !== q[0].songId) {
        return;
      }
      append(items.slice(1));
    },
    [append, ownerRef],
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
      beforeRadio.current = null;
      adopt(items, at, page);
    },
    [adopt],
  );

  const followProducer = useCallback(() => {
    const { queue: q, index: i } = cursor.current;
    const now = q[i];
    if (!now) return;
    beforeRadio.current = null;
    adopt([now], 0, PENDING);
    // ボカロPの画面が開くまで、いまの画面の置き場所に動画を出し続ける。出し続けないと、この画面がもう持ち主でなくなり、
    // 開くまでの一瞬だけ右下の窓になった
    holdSlot();
  }, [adopt, holdSlot]);

  // ラジオの並びを関連曲で伸ばす（use-radio-extension.ts）
  useRadioExtension({ active: owner.kind === 'radio', queue, index, position, cursor, append });

  const close = useCallback(() => {
    clearResume();
    setResumable(false);
    resumeAt.current = null;
    setSleep(null);
    setOwner(LOOSE);
    letSleep();
    resetEngines();
    commit(EMPTY_CURSOR);
    setPlaying(false);
    setLoading(false);
  }, [resetEngines, commit, setOwner, setSleep]);

  // 再生中は時刻を拾う。間は帯の側で補ってなめらかに進める
  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => {
      const p = playerRef.current;
      if (p) setTime({ ...p.time(), at: performance.now() });
    }, TIMING.positionPoll);
    return () => clearInterval(id);
  }, [playing, playerRef]);

  // 開いたときに、12時間以内に流していた前の曲があれば、止まった状態で戻す（player-resume.ts）。プレイヤーは作らない
  useEffect(() => {
    const saved = readResume();
    if (!saved) return;
    resumeAt.current = saved.position;
    setSound(savedVolume());
    setPlayback(savedPlayback());
    // 控えは localStorage にあり、サーバーでは読めない。描いたあとのこの effect で、開いたときに1回だけ戻すほかない
    // eslint-disable-next-line react-hooks/set-state-in-effect
    commit(withOrder(saved.queue, saved.index, saved.order));
    setOwner(saved.owner);
    setTime({ current: saved.position, duration: saved.duration, at: performance.now() });
    setResumable(true);
  }, [commit, setOwner, setPlayback, setSound]);

  /** 戻した前の曲を、聴いていた位置から流す（再生を押したとき） */
  const resume = useCallback(() => {
    const { queue: q, index: i } = cursor.current;
    if (!q[i]) return;
    const at = resumeAt.current;
    // 続きの位置をプレイヤーに先に渡す（startFrom）
    startFrom.current = at;
    load(q, i, settledOwner(ownerRef.current, q[i]));
    startFrom.current = null;
  }, [load, ownerRef]);

  // 流しているあいだ、並びとどこまで聴いたかを残す（use-resume-writer.ts）
  const resumeSnapshot = useCallback(() => {
    const { queue: q, index: i, order } = cursor.current;
    if (q.length === 0) return null;
    const t = playerRef.current?.time();
    return {
      queue: q,
      index: i,
      order,
      position: t?.current ?? 0,
      duration: t?.duration ?? 0,
      owner: settledOwner(ownerRef.current, q[i]),
    };
  }, [playerRef, ownerRef]);
  useResumeWriter(resumeSnapshot, { resumable, playing, time, queue, index, owner });

  const current = queue[index] ?? null;
  useWakeLock(playing);
  // 一時停止がしばらく続いたら、無音で開けておいた音の出口を止める（keep-awake.ts）。すぐ再生し直すときは開けたままにして、
  // 開け直しで鳴るプツッという音を出さない。流し始めたら開け直す
  useEffect(() => {
    if (playing) {
      keepAwake();
      return;
    }
    if (queue.length === 0) return;
    const timer = setTimeout(rest, TIMING.audioRest);
    return () => clearTimeout(timer);
  }, [playing, queue.length]);
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
        load(items, start, nextOwner);
        // 移る先の画面の置き場所ができるまで待つ（playAll の moving と同じ）。待たないと、移るまでの一瞬だけ右下の窓に出て、
        // 着いてから大きな置き場所へ移る動きが見えた
        if (moving) awaitSlot();
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
        // 絞っている途中にもう一度押されたら、止めるのをやめて音量を戻す。鳴っているなら、絞りきってから止める（use-engines.ts）
        if (playing || pausingSoftly()) {
          softPause();
          return;
        }
        watch.retried();
        if (playerRef.current?.service === 'niconico') primeParked(cursor.current.queue);
        // 止めていた音の出口を、押した操作の中で開け直す（押した操作の外だと、ブラウザが開け直しを止めることがある）
        keepAwake();
        playEngine();
      },
      step,
      close,
      seek: (seconds) => {
        if (resumable) resumeAt.current = seconds;
        playerRef.current?.seek(seconds);
        setTime((t) => ({ ...t, current: seconds, at: performance.now() }));
      },
      volume: sound.volume,
      muted: sound.muted,
      setVolume: (volume) => {
        // つまみを動かしたら消音は解く
        const next = { volume, muted: false };
        setSound(next);
        saveVolume(volume, false);
        setEngineVolume(volume);
      },
      toggleMute: () => {
        const now = soundRef.current ?? sound;
        const next = { ...now, muted: !now.muted };
        setSound(next);
        saveVolume(next.volume, next.muted);
        playerRef.current?.setMuted(next.muted);
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
      playerRef,
      resumable,
      resume,
      awaitSlot,
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
      startRadio,
      playRadio,
      fillRadio,
      stopRadio,
      followProducer,
      takeOver,
      step,
      close,
      sound,
      setSlot,
      holdSlot,
      holdingSlot,
      sleep,
      preload,
      skipsNiconico,
      setSleep,
      primeParked,
      pausingSoftly,
      softPause,
      playEngine,
      setEngineVolume,
      soundRef,
      setSound,
      ownerRef,
      watch,
    ],
  );

  return (
    <Context value={value}>
      <TimeContext value={time}>
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
          <CoverPlayButton
            cover={current.thumb}
            label={resumeText.resume(songTitle(current).main)}
            onClick={resume}
            sizes={`${IMAGE_SIZES.dockWide}px`}
            small
            className={`chrome-bottom ${DOCK} z-chrome overflow-hidden rounded-b-2xl bg-black shadow-dock ring-1 ring-line/60 dark:shadow-dock-dark`}
          />
        )}
        {/* 置き場所を待つあいだもプレイヤーの帯は出す（流し始めたことが分かるように） */}
        <PlayerBar item={shown} open={queue.length > 0} />
        <PlayerKeys />
      </TimeContext>
    </Context>
  );
}
