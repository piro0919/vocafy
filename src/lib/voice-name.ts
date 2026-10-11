import { vocalistNames } from './vocalist-names';

/** 歌声の日本語の名前（画面に出す名前）から英語の名前を引く表。日本語の画面では null（voice-names.ts の voiceNamesFor） */
export type VoiceNames = Readonly<Record<string, string>>;

/**
 * 画面に出す歌声の名前。英語の画面ではキャラの英語の名前（Hatsune Miku など）にする。表に無い歌声は日本語のまま。
 * 色・絵・影絵を引く鍵には日本語の名前を使い続けるので、名前を出す所でだけ通す
 */
export function voiceName(name: string, names: VoiceNames | null): string {
  return names?.[name] ?? name;
}

/** 曲の歌声の並び（「初音ミク・GUMI」のように「・」でつないだ文字列）の、画面に出す形 */
export function voiceNamesText(vocalists: string, names: VoiceNames | null): string {
  if (!names || !vocalists) return vocalists;
  return vocalistNames(vocalists)
    .map((name) => voiceName(name, names))
    .join('・');
}
