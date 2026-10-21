/**
 * 表紙の色（ambient.tsx の画面の上部の背景）。表紙を小さく描いた点の値から、主な色を2つ選ぶ。DOM に触らないので、テストから確かめられる
 */

/** 1つの点の値の数（赤・緑・青・透け） */
const RGBA = 4;
/** 色を粗く分ける細かさ。各色 8 ビットを上の bits ビットだけで分ける */
const BUCKET = { bits: 3, shift: 5 };
/** これより暗い色・明るい色（左右の黒い帯や白い余白）は数えない（0〜255） */
const NEAR_BLACK = 24;
const NEAR_WHITE = 235;
/** 鮮やかな色ほど重く数える度合い */
const VIVID_WEIGHT = 4;
/** 2つ目の色は、1つ目とこれだけ離れた色から選ぶ（RGB の距離） */
const SECOND_APART = 80;
/** 背景に敷いても文字が読めるよう、鮮やかさと明るさをこの幅に収める（0〜1） */
const MAX_SATURATION = 0.65;
const LIGHTNESS = { min: 0.3, max: 0.45 };

/**
 * 主な色を2つ選ぶ。色を粗く分けて数え、鮮やかな色ほど重く数える。
 * ほぼ黒・ほぼ白（左右の帯や余白）は数えない。2つ目は1つ目と十分に離れた色から選ぶ。
 * 文字が読めるよう、明るさと鮮やかさは一定の幅に収める
 */
export function colorsOf(data: ArrayLike<number>): [string, string] | null {
  const buckets = new Map<number, { r: number; g: number; b: number; weight: number }>();
  for (let i = 0; i < data.length; i += RGBA) {
    const [r, g, b] = [data[i], data[i + 1], data[i + 2]];
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    if (max < NEAR_BLACK || min > NEAR_WHITE) continue;
    const saturation = max === 0 ? 0 : (max - min) / max;
    const key =
      ((r >> BUCKET.shift) << (BUCKET.bits * 2)) |
      ((g >> BUCKET.shift) << BUCKET.bits) |
      (b >> BUCKET.shift);
    const bucket = buckets.get(key) ?? { r: 0, g: 0, b: 0, weight: 0 };
    const weight = 1 + saturation * VIVID_WEIGHT;
    bucket.r += r * weight;
    bucket.g += g * weight;
    bucket.b += b * weight;
    bucket.weight += weight;
    buckets.set(key, bucket);
  }
  const ranked = [...buckets.values()]
    .map((b) => ({ r: b.r / b.weight, g: b.g / b.weight, b: b.b / b.weight, weight: b.weight }))
    .sort((a, b) => b.weight - a.weight);
  const first = ranked[0];
  if (!first) return null;
  const distance = (a: typeof first, b: typeof first) =>
    Math.hypot(a.r - b.r, a.g - b.g, a.b - b.b);
  const second = ranked.find((c) => distance(c, first) > SECOND_APART) ?? first;
  return [tone(first), tone(second)];
}

/** RGB を、背景に敷いても文字が読める明るさと鮮やかさの HSL に寄せる */
function tone({ r, g, b }: { r: number; g: number; b: number }): string {
  const [rn, gn, bn] = [r / 255, g / 255, b / 255];
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  const d = max - min;
  let h = 0;
  if (d > 0) {
    // 色相の計算の式（6つの区間に分けて、緑・青の区間は 2・4 ずらす）
    // eslint-disable-next-line @typescript-eslint/no-magic-numbers
    if (max === rn) h = ((gn - bn) / d) % 6;
    else if (max === gn) h = (bn - rn) / d + 2;
    // eslint-disable-next-line @typescript-eslint/no-magic-numbers
    else h = (rn - gn) / d + 4;
  }
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  const hue = Math.round((h * 60 + 360) % 360);
  const sat = Math.round(Math.min(MAX_SATURATION, s) * 100);
  const light = Math.round(Math.min(LIGHTNESS.max, Math.max(LIGHTNESS.min, l)) * 100);
  return `hsl(${hue} ${sat}% ${light}%)`;
}

/**
 * 再生位置での色（ambient.tsx）。colors は曲の中で等間隔に取った色で、表紙と YouTube が自動で選ぶ途中の3コマ（0・25・50・75%）。
 * 位置を挟む2つの色を、進んだ割合で混ぜる。最後のコマから先は最後の色のまま。
 * 色相に沿って混ぜる（oklch）。oklab だと赤と緑のような離れた色の間が茶色く濁る。
 * 色がまだ読めていなければ undefined（いまの色を出したままにする）
 */
export function blendColors<T extends readonly [string, string]>(
  colors: (T | undefined)[],
  progress: number,
): [string, string] | T | undefined {
  const at = (i: number) => i / colors.length;
  let i = 0;
  while (i + 1 < colors.length && progress >= at(i + 1)) i++;
  const a = colors[i];
  const b = colors[i + 1];
  if (!a || !b) return a;
  const t = (progress - at(i)) / (at(i + 1) - at(i));
  const mix = (x: string, y: string) => `color-mix(in oklch, ${y} ${(t * 100).toFixed(1)}%, ${x})`;
  return [mix(a[0], b[0]), mix(a[1], b[1])];
}
