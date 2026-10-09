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
