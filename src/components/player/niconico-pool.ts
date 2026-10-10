/**
 * iPad・iPhone で、画面に見えているニコニコの曲の埋め込みを、隠して先に読み込んでおく。
 * iPad の Safari は、押す操作の無い再生を止める。ニコニコの埋め込みは曲ごとに作り直すので、押してから作ると読み込みを待つあいだに
 * 押した操作の続きとみなされなくなり、1回目は必ず止められた。読み込み済みの埋め込みなら、押した操作の中で play を送れば流れる
 * （帯の ▶ と同じ）。押されたら take で受け取り、プレイヤー（niconico.ts）がそのまま使う。
 *
 * 埋め込みは1つ目が 0.7MB ほど、2つ目からはスクリプトを使い回して 0.2MB ほど（2026-10-10 に測った）。動画は押すまで読み込まない。
 * 抱えるのは MAX まで。見えなくなった曲から古い順に外す
 */
const ORIGIN = 'https://embed.nicovideo.jp';
const MAX = 6;

export type Preloaded = {
  videoId: string;
  playerId: string;
  iframe: HTMLIFrameElement;
  /** 枠の中の入れ物。隠してある */
  box: HTMLElement;
};

type Entry = Preloaded & {
  ready: boolean;
  /** いま見えている曲の行の数 */
  wanted: number;
  at: number;
};

let serial = 0;

export function createNiconicoPool(
  frame: () => HTMLElement | null,
  /** いま流している動画。その曲は先に読み込まない（流し始めたあとも行は見えたままなので、同じ動画をもう1つ読み込んでいた） */
  playing: () => string | undefined,
) {
  const entries = new Map<string, Entry>();

  const onMessage = (e: MessageEvent<{ eventName?: string; playerId?: string }>) => {
    if (e.origin !== ORIGIN || e.data?.eventName !== 'loadComplete') return;
    for (const entry of entries.values()) {
      if (entry.playerId === e.data.playerId) entry.ready = true;
    }
  };
  window.addEventListener('message', onMessage);

  const remove = (entry: Entry) => {
    entries.delete(entry.videoId);
    entry.box.remove();
  };

  /** 見えなくなった曲から古い順に外して、空きを作る。空かなければ false */
  const makeRoom = () => {
    if (entries.size < MAX) return true;
    const idle = [...entries.values()].filter((e) => e.wanted === 0).sort((a, b) => a.at - b.at)[0];
    if (!idle) return false;
    remove(idle);
    return true;
  };

  return {
    /** 曲の行が見えた。読み込んでいなければ読み込み始める。返す関数は見えなくなったときに呼ぶ */
    want(videoId: string): () => void {
      if (videoId === playing()) return () => {};
      let entry = entries.get(videoId);
      if (!entry) {
        const container = frame();
        if (!container || !makeRoom()) return () => {};
        const playerId = `vocafy-pre-${++serial}`;
        const box = document.createElement('div');
        box.className = 'size-full';
        box.hidden = true;
        const iframe = document.createElement('iframe');
        iframe.allow = 'autoplay; fullscreen';
        iframe.title = 'ニコニコ動画のプレイヤー';
        iframe.src = `${ORIGIN}/watch/${encodeURIComponent(videoId)}?jsapi=1&playerId=${playerId}`;
        box.append(iframe);
        container.append(box);
        entry = { videoId, playerId, iframe, box, ready: false, wanted: 0, at: 0 };
        entries.set(videoId, entry);
      }
      const e = entry;
      e.wanted += 1;
      e.at = performance.now();
      return () => {
        e.wanted = Math.max(0, e.wanted - 1);
      };
    },
    /** 読み込み済みの埋め込みを受け取る（抱えるのをやめる）。読み込み途中か、無ければ null */
    take(videoId: string): Preloaded | null {
      const entry = entries.get(videoId);
      if (!entry?.ready) return null;
      entries.delete(videoId);
      return entry;
    },
    destroy() {
      window.removeEventListener('message', onMessage);
      for (const entry of [...entries.values()]) remove(entry);
    },
  };
}

export type NiconicoPool = ReturnType<typeof createNiconicoPool>;
