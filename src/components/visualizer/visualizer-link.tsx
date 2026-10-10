'use client';

import { useEffect, useRef, useSyncExternalStore } from 'react';
import type { QueueItem } from '@/lib/catalog';
import { readAmbientColors, subscribeAmbientColors } from '../ambient-colors';
import { usePlayer } from '../player/player-provider';
import { readVisualizer, subscribeVisualizer } from './visualizer-store';
import { COLORS } from '@/lib/colors';

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
 * CSS の色（hsl()・color-mix()・var() を含んでよい）を #rrggbb にする。ブラウザに計算させ、
 * 1画素のキャンバスに塗って読む。アプリは CSS を読めないので、送る前に直す
 */
function toHex(css: string): string {
  const probe = document.createElement('span');
  probe.style.color = css;
  document.body.append(probe);
  const computed = getComputedStyle(probe).color;
  probe.remove();
  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 1;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return COLORS.miku;
  ctx.fillStyle = computed;
  ctx.fillRect(0, 0, 1, 1);
  const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

/**
 * いま画面に当たっているキャラの色（`<html data-voice>`）。歌っているキャラの色に変える設定が ON なら曲ごとに変わり、
 * 切り替えは View Transitions のあとに当たるので、保存したサイトカラーではなく属性そのものを見張る
 */
function readHtmlVoice(): string {
  return document.documentElement.dataset.voice ?? 'miku';
}

function subscribeHtmlVoice(callback: () => void) {
  const observer = new MutationObserver(callback);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-voice'] });
  return () => observer.disconnect();
}

/**
 * 連携がオンのとき、流している曲の情報と、棒に塗る2色を Vocafy Visualizer に送る。
 * 色は画面の上部の背景と同じ、サムネから取った2色（再生位置に合わせて移る）。何も流していないときはサイトカラー。
 * 変わるたびに送り、つなぎ直したときも送り直す。音には触れない。画面には何も出さない
 */
export function VisualizerLink() {
  const on = useSyncExternalStore(subscribeVisualizer, readVisualizer, () => false);
  const ambient = useSyncExternalStore(subscribeAmbientColors, readAmbientColors, () => null);
  const voice = useSyncExternalStore(subscribeHtmlVoice, readHtmlVoice, () => 'miku');
  const { current, playing } = usePlayer();
  const socket = useRef<WebSocket | null>(null);
  /** つないだ直後に送る、いちばん新しい情報 */
  const latest = useRef<string | null>(null);

  useEffect(() => {
    if (!on) return;
    // 曲の色が無いときはサイトカラー。--miku は明るい画面でも暗い画面でも明るい差し色
    const colors = (ambient?.split('|') ?? ['var(--miku)', 'var(--miku)']).map(toHex);
    const message = JSON.stringify({
      song: current && {
        title: current.title,
        producer: current.producerName,
        vocalists: current.vocalists,
        artwork: artworkOf(current),
        playing,
      },
      colors,
      voice,
    });
    latest.current = message;
    const ws = socket.current;
    if (ws?.readyState === WebSocket.OPEN) ws.send(message);
  }, [on, current, playing, ambient, voice]);

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
