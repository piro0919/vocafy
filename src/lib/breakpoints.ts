/**
 * 画面の幅の区切り。Tailwind の sm・md・lg・xl と同じ値（test/design-rules.test.ts が Tailwind の theme.css との一致を見る）。
 * JavaScript で幅を見るとき（matchMedia・画像の sizes）は、数字を書かずにここから組み立てる
 */
export const BREAKPOINTS = { sm: '40rem', md: '48rem', lg: '64rem', xl: '80rem' } as const;

type Breakpoint = keyof typeof BREAKPOINTS;

/** その幅以上（Tailwind の md: などと同じ） */
export const atLeast = (bp: Breakpoint) => `(min-width: ${BREAKPOINTS[bp]})`;

/** その幅より狭い（Tailwind の max-md: などと同じ） */
export const below = (bp: Breakpoint) => `(width < ${BREAKPOINTS[bp]})`;
