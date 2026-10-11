/**
 * 共有の絵（og.tsx）の決め方のうち、絵を読まずに決まるもの。テストから確かめられる
 */

/** 影絵の高さ。2人のときは2人とも同じ大きさで、右側に収まるよう低くする */
const SINGER_HEIGHT = { one: 480, two: 400 };
/** 2人の影絵を並べる幅の上限。超えるときは、2人目を1人目の後ろに重ねて収める（横に広いキャラが表紙まで届かないように） */
const SINGERS_MAX_WIDTH = 680;
/** 2人を並べるときに、2人目を1人目に重ねる幅（隣り合わせて離れて見えないように） */
const SINGERS_OVERLAP = 24;

/**
 * ボカロPの絵に出すキャラ。その人の曲で一番多く歌っている、絵のあるキャラ（2026-10-11 に本人と決めた）。
 * 1人だけ返す。曲の数で数え（同じ曲に同じ名前が2回あっても1曲）、同じ数なら先に出てきた人
 */
export function favoriteSinger(
  songs: { vocalists: string[] }[],
  hasArt: (name: string) => boolean,
): string | null {
  const counts = new Map<string, number>();
  for (const s of songs) {
    for (const v of new Set(s.vocalists)) {
      if (hasArt(v)) counts.set(v, (counts.get(v) ?? 0) + 1);
    }
  }
  let top: [string, number] | null = null;
  for (const entry of counts) if (!top || entry[1] > top[1]) top = entry;
  return top?.[0] ?? null;
}

/**
 * 影絵（1人か2人）の並べ方。1人目を右端に、2人目をその左隣に少し重ねて置き、2人の幅が SINGERS_MAX_WIDTH を超えるときは
 * 2人目を1人目の後ろに重ねる。x は左端からの位置で、placements は渡した順（1人目・2人目）
 */
export function singerLayout(
  arts: { width: number; height: number }[],
): { width: number; height: number; placements: { x: number; width: number }[] } | null {
  const [first, second] = arts;
  if (!first) return null;
  const height = second ? SINGER_HEIGHT.two : SINGER_HEIGHT.one;
  const widthOf = (a: { width: number; height: number }) =>
    Math.round((a.width / a.height) * height);
  const firstWidth = widthOf(first);
  if (!second) return { width: firstWidth, height, placements: [{ x: 0, width: firstWidth }] };
  const secondWidth = widthOf(second);
  // 2人目の右端の、全体の右端からの距離
  const secondRight = Math.min(firstWidth - SINGERS_OVERLAP, SINGERS_MAX_WIDTH - secondWidth);
  const width = Math.max(firstWidth, secondRight + secondWidth);
  return {
    width,
    height,
    placements: [
      { x: width - firstWidth, width: firstWidth },
      { x: width - secondRight - secondWidth, width: secondWidth },
    ],
  };
}
