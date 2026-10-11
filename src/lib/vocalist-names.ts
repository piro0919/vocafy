/** 曲の歌声（「初音ミク・鏡音リン」の形。catalog.ts の QueueItem）を、名前の並びにする */
export function vocalistNames(vocalists: string): string[] {
  return vocalists.split('・').map((name) => name.trim());
}
