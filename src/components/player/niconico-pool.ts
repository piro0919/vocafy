import { langOfPath } from '@/i18n/config';
import { defineText } from '@/i18n/text';

/**
 * iPad・iPhone で、画面に見えているニコニコの曲の埋め込みを、隠して先に読み込んでおく。
 * iPad の Safari は、押す操作の無い再生を止める。ニコニコの埋め込みは曲ごとに作り直すので、押してから作ると読み込みを待つあいだに
 * 押した操作の続きとみなされなくなり、1回目は必ず止められた。読み込み済みの埋め込みなら、押した操作の中で play を送れば流れる
 * （帯の ▶ と同じ）。押されたら take で受け取り、プレイヤー（niconico.ts）がそのまま使う。
 *
 * 埋め込みは1つ目が 0.7MB ほど、2つ目からはスクリプトを使い回して 0.2MB ほど（2026-10-10 に測った）。動画は押すまで読み込まない。
 * 数の上限は置かず、行が画面から外れたら捨てる。抱える数は、画面に見えているニコニコの曲の数になる。
 * 初めは 6 つまでにしていたが、ニコニコの曲が多く並ぶ画面で7つ目からの行が1回で流れなかった（2026-10-10 に本人と外した）。
 * 一番多くなるのは、iPad で昔の年の月の全曲（2段組み）を開いたときで、20〜30 になりうる。iPad のメモリがどこまで耐えるかは測っていない
 */
const ORIGIN = 'https://embed.nicovideo.jp';

const TEXT = defineText({
  ja: { title: 'ニコニコ動画のプレイヤー' },
  en: { title: 'Niconico video player' },
});

/** 埋め込みの読み上げの名前。React の外で作るので、いまの住所から言語を読む */
export function niconicoFrameTitle(): string {
  return TEXT[langOfPath(location.pathname)].title;
}

/** 埋め込みの住所。from は流し始める位置（秒）。niconico.ts も使う */
export function niconicoEmbedUrl(videoId: string, playerId: string, from?: number): string {
  const start = from ? `&from=${Math.floor(from)}` : '';
  return `${ORIGIN}/watch/${encodeURIComponent(videoId)}?jsapi=1&playerId=${playerId}${start}`;
}

export type Preloaded = {
  videoId: string;
  playerId: string;
  iframe: HTMLIFrameElement;
  /** 枠の中の入れ物。隠してある */
  box: HTMLElement;
};

type Entry = Preloaded & {
  /** 読み込み始めた時刻（performance.now()） */
  since: number;
  ready: boolean;
  /** 音を消して流し、止め終えたか（動画の準備が済んだか） */
  warmed: boolean;
};

let serial = 0;
/** 埋め込みの statusChange の「再生中」（niconico.ts の STATUS と同じ） */
const PLAYING = 2;
/** 流し始める位置を持たないとき */
const NO_START = (): number | undefined => undefined;

export function createNiconicoPool(
  frame: () => HTMLElement | null,
  /** いま流している動画。その曲は先に読み込まない（流し始めたあとも行は見えたままなので、同じ動画をもう1つ読み込んでいた） */
  playing: () => string | undefined,
  /** その動画を流し始める位置（秒）。開き直して戻した曲の続きの位置 */
  startOf: (videoId: string) => number | undefined = NO_START,
) {
  const entries = new Map<string, Entry>();
  // いま見えている曲の行の数。埋め込みとは別に持つ。押されて埋め込みを渡したあとも行は見えたままなので、
  // 曲が替わったときに読み込み直せるように（refresh）。持たずにいたら、一度押した曲は2回目から1回で流れなかった（2026-10-13）
  const wanted = new Map<string, number>();

  const post = (entry: Entry, eventName: string, data?: Record<string, unknown>) =>
    entry.iframe.contentWindow?.postMessage(
      { eventName, data, sourceConnectorType: 1, playerId: entry.playerId },
      ORIGIN,
    );
  /**
   * 読み込めた埋め込みは、音を消して流し、流れ始めたらすぐ止めて、動画の準備まで済ませておく（2026-10-13）。
   * 埋め込みは再生を頼まれてから視聴の手続きと動画の読み込みを始めるので、押してから流れ始めるまで 1〜2 秒以上かかり、
   * iPhone ではそのあいだに押した操作の扱いが切れて止められることがあった。音を消した再生は押す操作なしでも許されるので、
   * 先に準備しておけば、押したときにすぐ流れる（本人の iPhone で、押した瞬間に音ありで流れた）。
   * 止めるときに埋め込みが player-error（The operation was aborted）を出すが、受け取られる前なので誰にも届かない
   */
  const onMessage = (
    e: MessageEvent<{ eventName?: string; playerId?: string; data?: { playerStatus?: number } }>,
  ) => {
    if (e.origin !== ORIGIN) return;
    const entry = [...entries.values()].find((x) => x.playerId === e.data?.playerId);
    if (!entry) return;
    if (e.data.eventName === 'loadComplete' && !entry.ready) {
      entry.ready = true;
      post(entry, 'mute', { mute: true });
      post(entry, 'play');
    }
    if (
      e.data.eventName === 'statusChange' &&
      e.data.data?.playerStatus === PLAYING &&
      !entry.warmed
    ) {
      entry.warmed = true;
      post(entry, 'pause');
    }
  };
  window.addEventListener('message', onMessage);

  const remove = (entry: Entry) => {
    entries.delete(entry.videoId);
    entry.box.remove();
  };

  /** 読み込んでいなければ読み込み始める。いま流している曲は読み込まない */
  const ensure = (videoId: string) => {
    if (videoId === playing() || entries.has(videoId)) return;
    const container = frame();
    if (!container) return;
    const playerId = `vocafy-pre-${++serial}`;
    const box = document.createElement('div');
    box.className = 'size-full';
    box.hidden = true;
    const iframe = document.createElement('iframe');
    iframe.allow = 'autoplay; fullscreen';
    iframe.title = niconicoFrameTitle();
    iframe.src = niconicoEmbedUrl(videoId, playerId, startOf(videoId));
    box.append(iframe);
    container.append(box);
    entries.set(videoId, {
      videoId,
      playerId,
      iframe,
      box,
      since: performance.now(),
      ready: false,
      warmed: false,
    });
  };

  return {
    /** 曲の行が見えた。読み込んでいなければ読み込み始める。返す関数は見えなくなったときに呼ぶ */
    want(videoId: string): () => void {
      wanted.set(videoId, (wanted.get(videoId) ?? 0) + 1);
      ensure(videoId);
      let released = false;
      return () => {
        if (released) return;
        released = true;
        const left = (wanted.get(videoId) ?? 1) - 1;
        if (left > 0) {
          wanted.set(videoId, left);
          return;
        }
        wanted.delete(videoId);
        // 見ている行が無くなったら捨てる。押されて受け取られたあと（take）の埋め込みは、流しているので抱えていない
        const entry = entries.get(videoId);
        if (entry) remove(entry);
      };
    },
    /** 読み込み済みの埋め込みを受け取る（抱えるのをやめる）。読み込み途中か、無ければ null */
    take(videoId: string): Preloaded | null {
      const entry = entries.get(videoId);
      if (!entry?.ready) return null;
      entries.delete(videoId);
      return entry;
    },
    /**
     * その曲の埋め込みの様子。押したのに止められたときに、先読みが無かったのか（none）、読み込み途中だったのか（loading）を
     * Sentry の記録で見分ける（use-engines.ts の swap）。ms は読み込み始めてからの時間
     */
    status(videoId: string): { preload: 'none' | 'loading' | 'ready'; ms?: number } {
      const entry = entries.get(videoId);
      if (!entry) return { preload: 'none' };
      return {
        preload: entry.ready ? 'ready' : 'loading',
        ms: Math.round(performance.now() - entry.since),
      };
    },
    /** 流す曲が替わったときに呼ぶ。見えているのに埋め込みの無い曲（前に受け取られた曲）を読み込み直す */
    refresh() {
      for (const videoId of wanted.keys()) ensure(videoId);
    },
    destroy() {
      window.removeEventListener('message', onMessage);
      for (const entry of [...entries.values()]) remove(entry);
      wanted.clear();
    },
  };
}

export type NiconicoPool = ReturnType<typeof createNiconicoPool>;
