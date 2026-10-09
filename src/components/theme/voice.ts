'use client';

import { VOICE_KEY } from './theme-script';

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

const isVoice = (v: string | null): v is Voice => VOICES.some((o) => o.value === v);

export function readVoice(): Voice {
  try {
    const v = localStorage.getItem(VOICE_KEY);
    return isVoice(v) ? v : 'miku';
  } catch {
    return 'miku';
  }
}

export function subscribeVoice(onChange: () => void): () => void {
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener('storage', onChange);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener('storage', onChange);
  };
}

export function setVoice(voice: Voice) {
  try {
    if (voice === 'miku') localStorage.removeItem(VOICE_KEY);
    else localStorage.setItem(VOICE_KEY, voice);
  } catch {
    // 保存できない窓では、開き直すと初音ミクに戻る
  }
  const apply = () => {
    if (voice === 'miku') delete document.documentElement.dataset.voice;
    else document.documentElement.dataset.voice = voice;
    window.dispatchEvent(new Event(CHANGE_EVENT));
  };
  // 色は画面じゅうで一度に変わるので、前と後の画面を重ねてフェードさせる（View Transitions）。
  // そのあいだは画面を写真にして重ねるため、流している動画の絵が一瞬止まって見える（音は止まらない）。
  // 対応していないブラウザと、動きを減らす設定の人には、いままでどおり一瞬で切り替える
  if (
    !document.startViewTransition ||
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  ) {
    apply();
    return;
  }
  document.startViewTransition(apply);
}

/**
 * 流している曲の歌声の色にする設定（2026-10-10）。ON のあいだは、流している曲の歌声に9人のキャラがいれば、その色にする。
 * 選んだサイトカラー（setVoice）はそのまま残り、9人のいない曲と、何も流していないときはその色に戻る
 */
const FOLLOW_KEY = 'vocafy-voice-follow';

export function readFollowVoice(): boolean {
  try {
    return localStorage.getItem(FOLLOW_KEY) === 'on';
  } catch {
    return false;
  }
}

export function setFollowVoice(on: boolean) {
  try {
    if (on) localStorage.setItem(FOLLOW_KEY, 'on');
    else localStorage.removeItem(FOLLOW_KEY);
  } catch {
    // 保存できない窓では、この画面のあいだだけ効く
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

/** 曲の歌声（「初音ミク・鏡音リン」の形）のうち、先に名前の出てくる9人のキャラ。いなければ null */
export function voiceOfVocalists(vocalists: string): Voice | null {
  for (const name of vocalists.split('・')) {
    const found = VOICES.find((o) => o.label === name.trim());
    if (found) return found.value;
  }
  return null;
}

/**
 * 画面の色だけを変える（保存しない）。歌声に合わせて曲ごとに変えるときに使う。
 * setVoice と違ってフェード（View Transitions）させない。フェードのあいだは画面を写真にして重ねるので、
 * 曲が変わるたびに動画の絵が止まって見える
 */
export function applyVoice(voice: Voice) {
  const now = document.documentElement.dataset.voice ?? 'miku';
  if (now === voice) return;
  if (voice === 'miku') delete document.documentElement.dataset.voice;
  else document.documentElement.dataset.voice = voice;
}
