'use client';

import { useEffect, useRef, useSyncExternalStore } from 'react';
import type { QueueItem } from '@/lib/catalog';
import { usePlayer } from '../player/player-provider';
import { readVisualizer, subscribeVisualizer } from './visualizer-store';

/** Vocafy Visualizer が待っている口。アプリの LinkServer.swift と docs/protocol.md に合わせる */
const LINK_URL = 'ws://127.0.0.1:47823';
/** アプリが起動していないあいだ、つなぎ直す間隔 */
const RETRY_MS = 5000;

/** 表紙の候補を、大きいものから。アプリは読めた最初の1枚を使う */
function artworkOf(item: QueueItem): string[] {
  if (item.service === 'youtube') {
    // maxresdefault は古い動画に無いことがある
    return ['maxresdefault', 'hqdefault', 'mqdefault'].map(
      (name) => `https://i.ytimg.com/vi/${item.videoId}/${name}.jpg`,
    );
  }
  // ニコニコの表紙は、末尾に .L（大）・.M（中）を付けた版がある。古い動画は付けない版だけ
  return [`${item.thumb}.L`, `${item.thumb}.M`, item.thumb];
}

/**
 * 連携がオンのとき、流している曲の情報を Vocafy Visualizer に送る。曲が変わったときと、再生・一時停止が
 * 変わったときに送り、つなぎ直したときも送り直す。音には触れない。画面には何も出さない
 */
export function VisualizerLink() {
  const on = useSyncExternalStore(subscribeVisualizer, readVisualizer, () => false);
  const { current, playing } = usePlayer();
  const socket = useRef<WebSocket | null>(null);
  const message = current
    ? JSON.stringify({
        title: current.title,
        producer: current.producerName,
        vocalists: current.vocalists,
        artwork: artworkOf(current),
        playing,
      })
    : null;
  /** つないだ直後に送る、いちばん新しい情報 */
  const latest = useRef<string | null>(null);

  useEffect(() => {
    latest.current = message;
    const ws = socket.current;
    if (message && ws?.readyState === WebSocket.OPEN) ws.send(message);
  }, [message]);

  useEffect(() => {
    if (!on) return;
    let closed = false;
    let retry: ReturnType<typeof setTimeout> | undefined;
    const connect = () => {
      const ws = new WebSocket(LINK_URL);
      socket.current = ws;
      ws.onopen = () => {
        if (latest.current) ws.send(latest.current);
      };
      ws.onclose = () => {
        socket.current = null;
        if (!closed) retry = setTimeout(connect, RETRY_MS);
      };
    };
    connect();
    return () => {
      closed = true;
      clearTimeout(retry);
      socket.current?.close();
      socket.current = null;
    };
  }, [on]);

  return null;
}
