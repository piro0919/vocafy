/**
 * 歌っているキャラの差し色とボタンの地（src/app/singer-themes.css）を書き出す。
 * 流している曲の歌声の色にする設定（voice-follower.tsx）で、<html data-singer> に合わせて使う。
 * 地・札・線の色味は、サイトカラー（data-voice）のまま変えない。
 *
 * キャラの色は src/lib/voice-color.ts（絵のあるキャラ全員）。サイトカラーで選べる9人は、globals.css の値をそのまま使う。
 * 残りは9人と同じ決め方で計算する: 差し色は、暗い画面では白に、明るい画面では黒に寄せていき、地に対して 5 : 1 に届いたところ。
 * ボタンの地は、白に寄せていき、字（on-miku）に対して 7 : 1 に届いたところ。地は、決まった灰色にキャラの色を数 % 混ぜる
 * （globals.css の9人の値から割り出した。2026-10-11）
 *
 * キャラの色を足したり変えたりしたら `pnpm voice-themes` で書き出し直す
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { COLORS } from '../src/lib/voice-color';

type RGB = [number, number, number];
type Theme = 'dark' | 'light';

const hex = (h: string): RGB => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)) as RGB;
const toHex = (c: RGB) =>
  '#' +
  c
    .map((x) =>
      Math.round(Math.min(255, Math.max(0, x)))
        .toString(16)
        .padStart(2, '0'),
    )
    .join('');
const mix = (a: RGB, b: RGB, t: number): RGB => a.map((x, i) => x + (b[i] - x) * t) as RGB;
const luminance = (c: RGB) => {
  const l = c.map((x) => {
    const s = Math.round(x) / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * l[0] + 0.7152 * l[1] + 0.0722 * l[2];
};
const contrast = (a: RGB, b: RGB) => {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};
/** c を to に少しずつ寄せ、against との比が ratio に届いたところの色 */
const reach = (c: RGB, to: RGB, against: RGB, ratio: number) => {
  let t = 0;
  while (contrast(mix(c, to, t), against) < ratio && t < 1) t += 0.01;
  return toHex(mix(c, to, t));
};

/** 地の色。決まった灰色に、キャラの色をこの割合で混ぜる */
const BACKGROUND: Record<Theme, [string, number]> = {
  dark: ['#111618', 0.05],
  light: ['#f6f8f8', 0.06],
};
const ON_MIKU = hex('#0b0f12');

function compute(color: string): Record<Theme, { accent: string; miku: string }> {
  const c = hex(color);
  const bg = (t: Theme) => mix(hex(BACKGROUND[t][0]), c, BACKGROUND[t][1]);
  const miku = reach(c, [255, 255, 255], ON_MIKU, 7);
  return {
    dark: { accent: reach(c, [255, 255, 255], bg('dark'), 5), miku },
    light: { accent: reach(c, [0, 0, 0], bg('light'), 5), miku },
  };
}

/** サイトカラーで選べる9人の値（globals.css）。初音ミクは :root の既定の色 */
function fromGlobals(): Record<string, Record<Theme, { accent: string; miku: string }>> {
  const css = readFileSync('src/app/globals.css', 'utf8');
  const vars = (block: string) =>
    Object.fromEntries([...block.matchAll(/--(\w+): (#[0-9a-f]{6})/g)].map((m) => [m[1], m[2]]));
  const block = (selector: string) => {
    const at = css.indexOf(selector);
    if (at < 0) throw new Error(`globals.css に ${selector} が無い`);
    return vars(css.slice(at, css.indexOf('}', at)));
  };
  const dark = block(":root[data-theme='dark'] {");
  const light = block(":root[data-theme='light'] {");
  const out: Record<string, Record<Theme, { accent: string; miku: string }>> = {
    初音ミク: {
      dark: { accent: dark.accent, miku: dark.miku },
      light: { accent: light.accent, miku: dark.miku },
    },
  };
  const NINE: Record<string, string> = {
    rin: '鏡音リン',
    len: '鏡音レン',
    luka: '巡音ルカ',
    meiko: 'MEIKO',
    kaito: 'KAITO',
    gumi: 'GUMI',
    teto: '重音テト',
    kafu: '可不',
  };
  for (const [key, name] of Object.entries(NINE)) {
    const d = block(`:root[data-voice='${key}'][data-theme='dark'] {`);
    const l = block(`:root[data-voice='${key}'][data-theme='light'] {`);
    out[name] = {
      dark: { accent: d.accent, miku: d.miku },
      light: { accent: l.accent, miku: l.miku },
    };
  }
  return out;
}

const fixed = fromGlobals();
const quote = (s: string) => `'${s.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
const rules = Object.entries(COLORS).flatMap(([name, color]) => {
  const theme = fixed[name] ?? compute(color);
  return (['dark', 'light'] as const).map(
    (t) =>
      `html:root[data-singer=${quote(name)}][data-theme='${t}'] {\n  --accent: ${theme[t].accent};\n  --miku: ${theme[t].miku};\n}`,
  );
});

writeFileSync(
  'src/app/singer-themes.css',
  `/*
 * 歌っているキャラの差し色とボタンの地。scripts/voice-themes.ts が書き出す（手で直さない）。
 * html を前に付けるのは、globals.css の :root[data-voice][data-theme] より強くするため
 */
${rules.join('\n')}
`,
);
console.log(`${Object.keys(COLORS).length} 人分を書き出した`);
