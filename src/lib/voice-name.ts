import type { Lang } from '@/i18n/config';
import { VOICE_NAMES_EN } from './voice-names-en';
import { vocalistNames } from './vocalist-names';

/**
 * 画面に出す歌声の名前。英語の画面ではキャラの英語の名前（Hatsune Miku など）にする。表に無い歌声は日本語のまま。
 * 色・絵・影絵を引く鍵には日本語の名前を使い続けるので、名前を出す所でだけ通す
 */
export function voiceName(name: string, lang: Lang): string {
  return lang === 'en' ? (VOICE_NAMES_EN[name] ?? name) : name;
}

/** 曲の歌声の並び（「初音ミク・GUMI」のように「・」でつないだ文字列）の、画面に出す形 */
export function voiceNamesText(vocalists: string, lang: Lang): string {
  if (lang !== 'en' || !vocalists) return vocalists;
  return vocalistNames(vocalists)
    .map((name) => voiceName(name, lang))
    .join('・');
}
