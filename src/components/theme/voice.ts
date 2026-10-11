'use client';

import { COLORS } from '@/lib/voice-color';
import { VOICE_KEY } from './theme-script';
import { vocalistNames } from '@/lib/vocalist-names';
import { prefersReducedMotion } from '@/lib/motion';
import { createLocalChoice, createLocalFlag } from '@/lib/local-flag';

/**
 * 画面の色を合わせるキャラ。miku は data-voice を付けない（globals.css の既定の色が初音ミク）。
 * art は public/characters/{id}.webp の絵、color は札の縁に使うキャラの色（voice-color.ts と同じ値）。
 * 画面の色の中身は globals.css の :root[data-voice] にある
 */
export const VOICES = [
  { value: 'miku', label: '初音ミク', art: 1, color: '#39c5bb' },
  { value: 'rin', label: '鏡音リン', art: 14, color: '#f29b00' },
  { value: 'len', label: '鏡音レン', art: 15, color: '#f5c400' },
  { value: 'luka', label: '巡音ルカ', art: 2, color: '#f37fa6' },
  { value: 'meiko', label: 'MEIKO', art: 176, color: '#d9363e' },
  { value: 'kaito', label: 'KAITO', art: 71, color: '#3d6fd8' },
  { value: 'gumi', label: 'GUMI', art: 3, color: '#78c13f' },
  { value: 'teto', label: '重音テト', art: 140308, color: '#e0405a' },
  { value: 'kafu', label: '可不', art: 83928, color: '#7fb7ec' },
] as const;

export type Voice = (typeof VOICES)[number]['value'];

const CHANGE_EVENT = 'vocafy-voice-change';

const choice = createLocalChoice<Voice>({
  key: VOICE_KEY,
  values: VOICES.map((o) => o.value),
  fallback: 'miku',
  event: CHANGE_EVENT,
});

export const readVoice = choice.read;
/** サイトカラーと、歌っているキャラの色に変える設定のどちらが変わっても知らせる（同じ合図） */
export const subscribeVoice = choice.subscribe;

export function setVoice(voice: Voice) {
  choice.save(voice);
  const apply = () => {
    if (voice === 'miku') delete document.documentElement.dataset.voice;
    else document.documentElement.dataset.voice = voice;
    choice.notify();
  };
  // 色は画面じゅうで一度に変わるので、前と後の画面を重ねてフェードさせる（View Transitions）。
  // そのあいだは画面を写真にして重ねるため、流している動画の絵が一瞬止まって見える（音は止まらない）。
  // 対応していないブラウザと、動きを減らす設定の人には、いままでどおり一瞬で切り替える
  if (!document.startViewTransition || prefersReducedMotion()) {
    apply();
    return;
  }
  document.startViewTransition(apply);
}

/**
 * 流している曲の歌声の色にする設定（2026-10-10）。ON のあいだは、流している曲の歌声に色のあるキャラ（絵のある82人）がいれば、
 * 差し色とボタンの地をその色にする（applySinger）。地の色味は選んだサイトカラー（setVoice）のまま。
 * そのキャラのいない曲と、何も流していないときは、全部が選んだサイトカラーに戻る。
 * はじめは ON（2026-10-10 に本人が決めた）。切ったときだけ 'off' を残す
 */
const follow = createLocalFlag({
  key: 'vocafy-voice-follow',
  value: 'off',
  stored: false,
  event: CHANGE_EVENT,
});

export const readFollowVoice = follow.read;
export const setFollowVoice = follow.write;

/** 曲の歌声（「初音ミク・鏡音リン」の形）のうち、先に名前の出てくる、色のあるキャラ（voice-color.ts）。いなければ null */
export function singerOfVocalists(vocalists: string): string | null {
  for (const name of vocalistNames(vocalists)) {
    if (Object.hasOwn(COLORS, name)) return name;
  }
  return null;
}

/**
 * 歌っているキャラの差し色とボタンの地にする（<html data-singer>。色の中身は singer-themes.css）。null で外す。
 * 地・札・線の色味はサイトカラー（data-voice）のまま残し、選んだ色を少し残す（2026-10-11 に本人と決めた）。
 * 保存しない。setVoice と違ってフェード（View Transitions）させない。フェードのあいだは画面を写真にして重ねるので、
 * 曲が変わるたびに動画の絵が止まって見える
 */
export function applySinger(name: string | null) {
  const root = document.documentElement;
  if ((root.dataset.singer ?? null) === name) return;
  if (name === null) delete root.dataset.singer;
  else root.dataset.singer = name;
}
