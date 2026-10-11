import 'server-only';

/**
 * ニコニコの表紙の大きい版（末尾に .L を付けた 360×270。上下に黒い帯の付いた 4:3 で、帯を切ると表紙の枠とほぼ同じ大きさ）。
 * 2012年ごろより前の動画には無く 404 が返るので、そのときは null。2026-10-12 に202曲を抜き取って調べ、
 * 2011年までは52曲中1曲、2012年からは150曲中148曲で取れた。ふつうの表紙は 130×100 で、大きく出すとぼやける。
 * ニコニコにつながらないときも null（大きく出さない側に倒す）
 */
export async function niconicoBigCover(thumb: string): Promise<string | null> {
  const url = `${thumb}.L`;
  try {
    return (await fetch(url, { method: 'HEAD' })).ok ? url : null;
  } catch {
    return null;
  }
}
