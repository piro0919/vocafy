'use client';

import { createContext, type ReactNode, useContext, useEffect, useRef, useState } from 'react';
import { thumbOf } from '@/lib/thumb';
import { usePlayer } from './player/player-provider';

/**
 * 画面の上部に敷く、サムネイルの色のグラデーション（YouTube Music のアルバムの画面に近い形）。
 *
 * サムネイルそのものをぼかして敷くのは改変にあたり、YouTube の規約で使えない。ここでは絵から
 * 主な色を2つ計算し、その色だけで背景を作る。絵はどこにも描かない。
 * 色を読むには同じドメインの画像が要るので、Next.js の画像変換（/_next/image）を通して小さく読む。
 * YouTube のサーバーへ取りに行くのは、表示しているサムネイルと同じく画像変換の側だけ
 */

/** 色が決まらないとき（何も流していないときなど）に敷く、Vocafy の差し色のグラデーション */
const BRAND_COLORS: Colors = [
  'color-mix(in oklab, var(--accent) 16%, transparent)',
  'color-mix(in oklab, var(--accent) 28%, transparent)',
];

type Colors = [string, string];

/** 一度計算した色。同じ画面に戻ったときは計算し直さず、すぐ出す */
const cache = new Map<string, Colors | null>();

/** この画面の背景の色をどの絵から取るか。null は「流している曲の色、無ければ差し色」 */
const SourceContext = createContext<(image: string | null) => void>(() => {});

/**
 * 画面の上部に敷く、色のグラデーション。全ページ共通で1つだけ置き（layout.tsx）、画面を移っても作り直さない。
 * 各ページは AmbientSource で「この画面はこの絵の色」と伝えるだけで、色は前の画面の色から直接移り変わる。
 * 伝えない画面（一覧・ライブラリ・検索・設定など）は、流している曲のサムネイルの色、流していなければ差し色にする
 */
export function AmbientProvider({ children }: { children: ReactNode }) {
  const [source, setSource] = useState<string | null>(null);
  const { current } = usePlayer();
  const image = source ?? (current ? thumbOf(current.videoId) : null);

  // 色が変わるたびに層を重ね、新しい層をふわっと出してから古い層を捨てる。グラデーションは
  // CSS の transition で移り変わらないので、重ねて透明度で入れ替える
  const [layers, setLayers] = useState<{ id: number; colors: Colors }[]>([]);
  const nextId = useRef(0);
  const shown = useRef<string>('');

  useEffect(() => {
    let cancelled = false;
    const show = (colors: Colors) => {
      const key = colors.join();
      if (cancelled || key === shown.current) return;
      shown.current = key;
      const id = nextId.current++;
      setLayers((prev) => [...prev.slice(-1), { id, colors }]);
    };
    if (!image) {
      show(BRAND_COLORS);
      return;
    }
    const known = cache.get(image);
    if (known !== undefined) {
      show(known ?? BRAND_COLORS);
      return;
    }
    const img = new Image();
    // 画像変換が受け付ける幅（imageSizes）と画質（75）に合わせる
    img.src = `/_next/image?url=${encodeURIComponent(image)}&w=64&q=75`;
    img.onload = () => {
      const found = pickColors(img);
      cache.set(image, found);
      show(found ?? BRAND_COLORS);
    };
    return () => {
      cancelled = true;
    };
  }, [image]);

  return (
    <SourceContext value={setSource}>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[32rem] opacity-35 dark:opacity-100"
      >
        {layers.map((layer) => (
          <div
            key={layer.id}
            className="absolute inset-0 animate-[fade-in_0.7s_ease-out_both]"
            style={{
              background: [
                `radial-gradient(60% 80% at 85% 0%, ${layer.colors[1]}, transparent 70%)`,
                `linear-gradient(to bottom, ${layer.colors[0]}, transparent)`,
              ].join(', '),
            }}
          />
        ))}
      </div>
      {children}
    </SourceContext>
  );
}

/** この画面の背景の色を、この絵から取る。画面を離れたら、流している曲の色に戻す。何も描かない */
export function AmbientSource({ image }: { image: string | null }) {
  const setSource = useContext(SourceContext);
  useEffect(() => {
    setSource(image);
    return () => setSource(null);
  }, [image, setSource]);
  return null;
}

/**
 * 主な色を2つ選ぶ。色を粗く分けて数え、鮮やかな色ほど重く数える。
 * ほぼ黒・ほぼ白（左右の帯や余白）は数えない。2つ目は1つ目と十分に離れた色から選ぶ。
 * 文字が読めるよう、明るさと鮮やかさは一定の幅に収める
 */
function pickColors(img: HTMLImageElement): [string, string] | null {
  const canvas = document.createElement('canvas');
  canvas.width = 32;
  canvas.height = 18;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);

  const buckets = new Map<number, { r: number; g: number; b: number; weight: number }>();
  for (let i = 0; i < data.length; i += 4) {
    const [r, g, b] = [data[i], data[i + 1], data[i + 2]];
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    if (max < 24 || min > 235) continue;
    const saturation = max === 0 ? 0 : (max - min) / max;
    const key = ((r >> 5) << 6) | ((g >> 5) << 3) | (b >> 5);
    const bucket = buckets.get(key) ?? { r: 0, g: 0, b: 0, weight: 0 };
    const weight = 1 + saturation * 4;
    bucket.r += r * weight;
    bucket.g += g * weight;
    bucket.b += b * weight;
    bucket.weight += weight;
    buckets.set(key, bucket);
  }
  const ranked = [...buckets.values()]
    .map((b) => ({ r: b.r / b.weight, g: b.g / b.weight, b: b.b / b.weight, weight: b.weight }))
    .toSorted((a, b) => b.weight - a.weight);
  const first = ranked[0];
  if (!first) return null;
  const distance = (a: typeof first, b: typeof first) =>
    Math.hypot(a.r - b.r, a.g - b.g, a.b - b.b);
  const second = ranked.find((c) => distance(c, first) > 80) ?? first;
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
    if (max === rn) h = ((gn - bn) / d) % 6;
    else if (max === gn) h = (bn - rn) / d + 2;
    else h = (rn - gn) / d + 4;
  }
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  const hue = Math.round((h * 60 + 360) % 360);
  const sat = Math.round(Math.min(0.65, s) * 100);
  const light = Math.round(Math.min(0.45, Math.max(0.3, l)) * 100);
  return `hsl(${hue} ${sat}% ${light}%)`;
}
