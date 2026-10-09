import type { QueueItem } from '@/lib/catalog';

/** ループ。all は並び全体を繰り返し、one は今の曲を繰り返す */
export type Repeat = 'all' | 'one';

/**
 * 並びの出どころ。list はふつうの一覧、pending は曲の一覧から押して1曲だけ流している途中（ボカロPの画面で差し替える）、
 * radio はラジオ（押した曲から関連曲を足し続ける。並びの終わりが近づくと、いまの曲の関連曲を後ろに足す）、
 * favorites はお気に入りの曲の並び（お気に入りの曲の画面で大きく出す。Janify と同じ）
 */
export type PlayContext = 'list' | 'pending' | 'radio' | 'favorites';

/**
 * 「すべて再生」で流している一覧の続き。source は一覧の住所（years/2010 など）、start は押したページ、
 * next は次に足すページ、last は最後のページ。最後のページの次は1ページ目に戻り、押したページの手前まで足す
 */
export type ListSource = { source: string; start: number; next: number; last: number };

/** 時刻は流している仕組み（YouTube かニコニコ）から 0.5 秒おきに拾う。at は拾った瞬間で、その間は表示側で補って進める */
export type PlaybackTime = { current: number; duration: number; at: number };

export type PlayerContext = {
  queue: QueueItem[];
  index: number;
  current: QueueItem | null;
  playing: boolean;
  /** 曲を選んでから音が出るまで。最初の1曲は YouTube の仕組みやニコニコのプレイヤーの読み込みも待つ */
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
  /**
   * 一覧の1ページの曲を流し、並びの終わりが近づいたら、一覧の残りのページの曲を後ろに足していく（play-all.tsx）。
   * ページ数が多い一覧（初音ミクの年など）を、押した時点で全部送らないため
   */
  playAll: (
    items: QueueItem[],
    source: Omit<ListSource, 'next'>,
    options?: {
      /** items の何番目から流すか。既定は先頭 */
      at?: number;
      /** 流し始めてから一覧の再生用の画面へ移るとき。置き場所が見つかるまで右下の窓を出さずに待つ */
      moving?: boolean;
    },
  ) => void;
  /** 「すべて再生」で流している一覧の住所。ほかの並びを流しているときは null */
  listSource: string | null;
  /**
   * いまの曲を大きく出す画面の住所。ラジオのあいだはラジオの画面（/radio/123）。ラジオをやめた直後は、
   * 戻した並びの持ち主の画面（いま流しているラジオの曲が終わるまで、その画面で大きく出したままにする）。ほかは null
   */
  radioHome: string | null;
  /** その曲からラジオを流す。いま流している曲なら、止めずにラジオに切り替える。ラジオの画面へ移るのは呼んだ側 */
  startRadio: (seed: QueueItem) => void;
  /** ラジオの画面の一覧（先頭が元の曲、続いて関連曲）を、at 番目から流す */
  playRadio: (items: QueueItem[], at: number) => void;
  /**
   * ラジオを始めたばかりで並びがまだ元の曲だけなら、ラジオの画面が持っている関連曲で埋める（取りに行くのを待たない）
   */
  fillRadio: (items: QueueItem[]) => void;
  /**
   * ラジオをやめる。いまの曲は止めずに、ラジオを始める前に流していた並びに戻す。いまの曲が終わったら、
   * ラジオを始めた曲の次から続く（ラジオの曲を流しているなら、その曲を始めた曲のすぐ後ろに挟む）。
   * 戻した並びの持ち主の画面の住所を返す
   */
  stopRadio: () => string;
  /**
   * 次に流れる曲を読む。流す順（ランダムなら混ぜたあとの順）で、いまの曲の次から UPCOMING_LIMIT 曲まで。
   * ループ（全体）なら、並びの最後のあとに先頭からの曲も続ける（ラジオは足していくので続けない）。
   * index は並び（queue）の何番目か。jumpTo に渡す。流す順は描くたびに変わらない入れ物（ref）に持っているので、
   * 値ではなく、開いた画面が読む関数として渡す（曲や並びが変わると、この値の持ち主ごと描き直される）
   */
  upcoming: () => { item: QueueItem; index: number }[];
  /** 並びの index 番目の曲へ飛ぶ。並びと流す順はそのまま */
  jumpTo: (index: number) => void;
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
  /**
   * 画面を移るあいだ、いま動画を大きく出している置き場所に、行き先の画面の置き場所ができるまで出し続けさせる。
   * ラジオの入・切は、並びの持ち主が先に替わってから画面が移るので、そのあいだ動画が右下の窓へ出かかった。
   * 行き先の置き場所ができるか、HOLD_SLOT を過ぎたら終わる
   */
  holdSlot: () => void;
  /** holdSlot の途中か（player-stage.tsx が読む） */
  holdingSlot: boolean;
};
