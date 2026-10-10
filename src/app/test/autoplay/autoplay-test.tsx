'use client';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { probeAutoplay, probeAutoplayInFrame } from '@/lib/autoplay-probe';

type Result = 'allowed' | 'blocked' | 'unknown' | null;

const ORIGIN = 'https://embed.nicovideo.jp';
const VIDEO = 'sm46875288';
const PLAYER_ID = 'vocafy-probe';

const noSubscribe = () => () => {};

const LABEL: Record<Exclude<Result, null>, string> = {
  allowed: '許可',
  blocked: '拒否',
  unknown: '不明',
};

export function AutoplayTest() {
  const [audio, setAudio] = useState<Result>(null);
  const [framed, setFramed] = useState<Result>(null);
  const [niconico, setNiconico] = useState<Result>(null);
  const agent = useSyncExternalStore(
    noSubscribe,
    () => navigator.userAgent,
    () => '',
  );
  const box = useRef<HTMLDivElement>(null);

  // 無音の音声。ページを開いたときに、押す操作なしで試す
  useEffect(() => {
    void probeAutoplay().then(setAudio);
    void probeAutoplayInFrame().then(setFramed);
  }, []);

  // ニコニコの埋め込み。読み込みが終わってから、押す操作なしで play を送る（自動で次の曲へ進むときと同じ）。
  // 流れたら、すぐ止める
  useEffect(() => {
    const container = box.current;
    if (!container) return;
    const iframe = document.createElement('iframe');
    iframe.allow = 'autoplay; fullscreen';
    iframe.src = `${ORIGIN}/watch/${VIDEO}?jsapi=1&playerId=${PLAYER_ID}`;
    container.append(iframe);
    const send = (eventName: string) =>
      iframe.contentWindow?.postMessage(
        { eventName, sourceConnectorType: 1, playerId: PLAYER_ID },
        ORIGIN,
      );
    let done = false;
    const finish = (result: Exclude<Result, null>) => {
      if (done) return;
      done = true;
      setNiconico(result);
    };
    const onMessage = (
      e: MessageEvent<{ eventName?: string; playerId?: string; data?: { playerStatus?: number } }>,
    ) => {
      if (e.origin !== ORIGIN || e.data?.playerId !== PLAYER_ID) return;
      const { eventName, data } = e.data;
      if (eventName === 'loadComplete') send('play');
      if (eventName === 'statusChange' && data?.playerStatus === 2) {
        send('pause');
        finish('allowed');
      }
      if (eventName === 'player-error:video:play') finish('blocked');
    };
    window.addEventListener('message', onMessage);
    const timer = setTimeout(() => finish('unknown'), 15_000);
    return () => {
      window.removeEventListener('message', onMessage);
      clearTimeout(timer);
      iframe.remove();
    };
  }, []);

  const same = framed && niconico ? (framed === niconico ? 'そろった' : '食い違った') : '判定中';

  return (
    <div className="space-y-6 pb-8">
      <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-3">
        <dt className="text-muted">無音の音声（本体）</dt>
        <dd className="font-bold">{audio ? LABEL[audio] : '判定中'}</dd>
        <dt className="text-muted">無音の音声（埋め込み）</dt>
        <dd className="font-bold">{framed ? LABEL[framed] : '判定中'}</dd>
        <dt className="text-muted">ニコニコ</dt>
        <dd className="font-bold">{niconico ? LABEL[niconico] : '判定中'}</dd>
        <dt className="text-muted">埋め込みとニコニコ</dt>
        <dd className="font-bold">{same}</dd>
      </dl>
      <p className="text-xs break-all text-muted">{agent}</p>
      <div ref={box} className="hidden" />
    </div>
  );
}
