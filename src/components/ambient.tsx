'use client';

import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { frameOf } from '@/lib/thumb';
import { usePlayer } from './player/player-provider';

/**
 * 画面の上部に敷く、サムネイルの色のグラデーション（YouTube Music のアルバムの画面に近い形）。
 *
 * サムネイルそのものをぼかして敷くのは改変にあたり、YouTube の規約で使えない。ここでは絵から
 * 主な色を2つ計算し、その色だけで背景を作る。絵はどこにも描かない。
 * 色を読むには、ほかのサイトから読むことを許した画像か、同じドメインの画像が要る。YouTube の表紙は許されているので
 * 直接読み、ほかは Next.js の画像変換（/_next/image）を通して小さく読む
 */

/** 色が決まらないとき（何も流していないときなど）に敷く、Vocafy の差し色のグラデーション */
const BRAND_COLORS: Colors = [
  'color-mix(in oklab, var(--accent) 16%, transparent)',
  'color-mix(in oklab, var(--accent) 28%, transparent)',
];

type Colors = [string, string];

/** 一度計算した色。同じ画面に戻ったときは計算し直さず、すぐ出す。null は「色が取れなかった」 */
const cache = new Map<string, Colors | null>();
/** 読み込み中の絵。同じ絵を二重に取りに行かない */
const loading = new Set<string>();

/** 曲の中で色を取る位置。表紙と、YouTube が自動で選ぶ途中の3コマ（frameOf） */
const STOPS = [0, 0.25, 0.5, 0.75];

/** この画面の背景の色をどの絵から取るか。null は「流している曲の色、無ければ差し色」 */
const SourceContext = createContext<(image: string | null) => void>(() => {});

/**
 * 画面の上部に敷く、色のグラデーション。全ページ共通で1つだけ置き（layout.tsx）、画面を移っても作り直さない。
 * 各ページは AmbientSource で「この画面はこの絵の色」と伝えるだけで、色は前の画面の色から直接移り変わる。
 *
 * 曲を流しているあいだは、どの画面でもその曲の色にする。YouTube の曲は表紙と途中の3コマから色を取り、
 * 再生位置に合わせて隣り合う2つの色を少しずつ混ぜて、曲の進みに沿ってじわじわ移す。
 * ニコニコの曲は途中のコマが取れないので、表紙の色のまま。
 * 何も流していないときは、伝えられた絵の色、それも無ければ差し色にする
 */
export function AmbientProvider({ children }: { children: ReactNode }) {
  const [source, setSource] = useState<string | null>(null);
  const { current, time } = usePlayer();
  const videoId = current?.videoId ?? null;
  const service = current?.service;
  const thumb = current?.thumb;
  const images = useMemo(() => {
    if (!videoId || !thumb) return source ? [source] : [];
    return service === 'youtube'
      ? [thumb, frameOf(videoId, 1), frameOf(videoId, 2), frameOf(videoId, 3)]
      : [thumb];
  }, [videoId, service, thumb, source]);

  // 絵を読み、色が取れたら描き直す
  const [, setLoaded] = useState(0);
  useEffect(() => {
    for (const image of images) {
      if (cache.has(image) || loading.has(image)) continue;
      loading.add(image);
      const img = new Image();
      if (image.startsWith('https://i.ytimg.com/')) {
        // YouTube の表紙はほかのサイトからも読める（Access-Control-Allow-Origin: *）ので、変換を通さず直接読む。
        // 画像変換は1枚ごとに料金がかかるので、1曲で4枚読むここでは使わない
        img.crossOrigin = 'anonymous';
        img.src = image;
      } else {
        // ニコニコの表紙やボカロPの画像は直接は色を読めないので、画像変換で同じドメインにして読む。
        // 画像変換が受け付ける幅（imageSizes）と画質（75）に合わせる
        img.src = `/_next/image?url=${encodeURIComponent(image)}&w=64&q=75`;
      }
      const done = (found: Colors | null) => {
        loading.delete(image);
        cache.set(image, found);
        setLoaded((n) => n + 1);
      };
      img.onload = () => done(pickColors(img));
      img.onerror = () => done(null);
    }
  }, [images]);

  // 各位置の色。途中のコマが真っ黒などで色が取れなければ、1つ前の位置の色を引き継ぐ
  const stops: (Colors | undefined)[] = [];
  for (const [i, image] of images.entries()) {
    const found = cache.get(image);
    stops.push(found ?? (i === 0 ? (found === null ? BRAND_COLORS : undefined) : stops[i - 1]));
  }
  const progress = videoId && time.duration > 0 ? Math.min(1, time.current / time.duration) : 0;
  const colors = images.length === 0 ? BRAND_COLORS : blend(stops, progress);

  // 曲や画面が変わったとき、シークで大きく飛んだときは層を重ねてふわっと入れ替える。
  // 再生が進むだけのときは、いまの層の色をそのまま書き換える（0.5 秒ごとの小さな差なので段は見えない）
  const [layers, setLayers] = useState<{ id: number; colors: Colors }[]>([]);
  const nextId = useRef(0);
  const scene = useRef<{ image: string | undefined; progress: number }>({
    image: undefined,
    progress: 0,
  });
  const [from, to] = colors ?? [];
  useEffect(() => {
    if (!from || !to) return;
    const fresh =
      images[0] !== scene.current.image || Math.abs(progress - scene.current.progress) > 0.05;
    scene.current = { image: images[0], progress };
    const next: Colors = [from, to];
    setLayers((prev) => {
      const last = prev.at(-1);
      if (fresh || !last) return [...prev.slice(-1), { id: nextId.current++, colors: next }];
      if (last.colors[0] === from && last.colors[1] === to) return prev;
      return [...prev.slice(0, -1), { ...last, colors: next }];
    });
  }, [from, to, images, progress]);

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

/**
 * 再生位置での色。位置を挟む2つの色を、進んだ割合で混ぜる。最後のコマから先は最後の色のまま。
 * 色相に沿って混ぜる（oklch）。oklab だと赤と緑のような離れた色の間が茶色く濁る。
 * 表紙の色がまだ読めていなければ undefined（いまの色を出したままにする）
 */
function blend(stops: (Colors | undefined)[], progress: number): Colors | undefined {
  let i = 0;
  while (i + 1 < stops.length && progress >= STOPS[i + 1]) i++;
  const a = stops[i];
  const b = stops[i + 1];
  if (!a || !b) return a;
  const t = (progress - STOPS[i]) / (STOPS[i + 1] - STOPS[i]);
  const mix = (x: string, y: string) => `color-mix(in oklch, ${y} ${(t * 100).toFixed(1)}%, ${x})`;
  return [mix(a[0], b[0]), mix(a[1], b[1])];
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
