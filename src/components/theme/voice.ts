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
  { value: 'meiko', label: 'メイコ', art: 176, color: '#d9363e' },
  { value: 'kaito', label: 'カイト', art: 71, color: '#3d6fd8' },
  { value: 'gumi', label: 'グミ', art: 3, color: '#78c13f' },
  { value: 'gakupo', label: '神威がくぽ', art: 12, color: '#7d55c7' },
  { value: 'teto', label: '重音テト', art: 140308, color: '#e0405a' },
  { value: 'ia', label: 'イア', art: 504, color: '#e8b4cf' },
  { value: 'kafu', label: '可不', art: 83928, color: '#7fb7ec' },
  { value: 'yukari', label: '結月ゆかり', art: 134288, color: '#a679d8' },
  { value: 'yuki', label: '歌愛ユキ', art: 191, color: '#e85d8c' },
  { value: 'flower', label: 'ブイフラワ', art: 21165, color: '#8a4fbf' },
  { value: 'una', label: '音街ウナ', art: 170649, color: '#f08a3c' },
  { value: 'lily', label: 'リリィ', art: 139, color: '#e3c13b' },
  { value: 'mayu', label: 'MAYU', art: 1766, color: '#d9a0dc' },
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
  if (voice === 'miku') delete document.documentElement.dataset.voice;
  else document.documentElement.dataset.voice = voice;
  window.dispatchEvent(new Event(CHANGE_EVENT));
}
