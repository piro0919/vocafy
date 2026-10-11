/**
 * お気に入りの並びの操作。値を書き換えず、次の並びを返すだけにする（テストできるように）
 */

/** from の項目を、to の項目がいた位置へ動かす。どちらかが無いか同じなら null（動かさない） */
export function moveItem<T>(
  list: T[],
  from: number,
  to: number,
  idOf: (item: T) => number,
): T[] | null {
  const i = list.findIndex((item) => idOf(item) === from);
  const j = list.findIndex((item) => idOf(item) === to);
  if (i < 0 || j < 0 || i === j) return null;
  const next = [...list];
  const [moved] = next.splice(i, 1);
  next.splice(j, 0, moved!);
  return next;
}

/**
 * 引き直した情報（got）で、いまの並び（current）を置き換える。sent は引き直しに送った項目。
 * 送った項目は新しい情報に替え、返ってこなかった項目（流せなくなった曲・台帳から消えた人）は外す。
 * 待っているあいだに足した項目（送っていない項目）は、そのまま残す。並びはいまの並びのまま
 */
export function mergeFresh<T>(current: T[], sent: T[], got: T[], idOf: (item: T) => number): T[] {
  const sentIds = new Set(sent.map(idOf));
  const byId = new Map(got.map((item) => [idOf(item), item]));
  return current.flatMap((item) => {
    const id = idOf(item);
    if (!sentIds.has(id)) return [item];
    const now = byId.get(id);
    return now ? [now] : [];
  });
}
