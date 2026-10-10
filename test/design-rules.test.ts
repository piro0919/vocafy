import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { BREAKPOINTS } from '../src/lib/breakpoints';
import { COLORS } from '../src/lib/colors';
import { EASE_OUT, MOTION } from '../src/lib/motion';

/**
 * 見た目の決まり（CLAUDE.md の「見た目」）から外れた書き方を見つける。ボタンや部品をその場で書き起こすと、
 * 少しずつ違う形が増えた（2026-10-09 に洗い出して直した）。決まりを変えるときは、ここも一緒に変える
 */

const ROOT = join(import.meta.dirname, '..', 'src');
const files = readdirSync(ROOT, { recursive: true, encoding: 'utf8' })
  .filter((f) => /\.(tsx|ts)$/.test(f))
  .map((f) => ({ path: f, lines: readFileSync(join(ROOT, f), 'utf8').split('\n') }));

/** 決まりに合わない行を「ファイル:行」で集める。コメントの行は見ない */
function offenders(test: (line: string) => boolean, allow: string[] = []): string[] {
  return files.flatMap(({ path, lines }) =>
    allow.includes(path)
      ? []
      : lines.flatMap((line, i) =>
          /^\s*(\/\/|\*|\/\*|\{\/\*)/.test(line) || !test(line) ? [] : [`${path}:${i + 1}`],
        ),
  );
}

describe('見た目の決まり', () => {
  // 動きの長さと曲線は globals.css の @theme と src/lib/motion.ts にだけ書く（2026-10-11 に本人と決めた。例外は置かない）
  it('動きの長さは duration-react・move・slow の名前だけ（数字を書かない）', () => {
    expect(offenders((l) => /(?<![\w-])duration-(\d|\[|\()/.test(l))).toEqual([]);
  });

  it('動きの曲線を部品で書かない（既定の ease-out にまかせる）', () => {
    expect(offenders((l) => /(?<![\w(_[-])ease-[\w([]/.test(l))).toEqual([]);
  });

  it('動き（animate-*）をその場で組み立てない（globals.css の @theme に名前を付けて置く）', () => {
    expect(offenders((l) => /animate-\[/.test(l))).toEqual([]);
  });

  it('JavaScript の動きも MOTION と EASE_OUT から取る', () => {
    expect(
      offenders(
        (l) => /\bduration:\s*[1-9]/.test(l) || /\beasing:\s*['"`]/.test(l),
        // 知らせ（toast）を出しておく時間。動きの長さではない
        ['app/history/history-view.tsx', 'app/search/search-view.tsx'],
      ),
    ).toEqual([]);
  });

  it('globals.css の動きは @theme の長さを使い、数字を書かない', () => {
    const css = readFileSync(join(ROOT, 'app', 'globals.css'), 'utf8').split('\n');
    const raw = css.flatMap((line, i) =>
      /^\s*(--|\*|\/\*)/.test(line) ||
      !/\b\d+(\.\d+)?m?s\b/.test(line) ||
      /\b0s !important/.test(line)
        ? []
        : [`app/globals.css:${i + 1}`],
    );
    expect(raw).toEqual([]);
  });

  it('globals.css の長さと曲線は src/lib/motion.ts と同じ値', () => {
    const css = readFileSync(join(ROOT, 'app', 'globals.css'), 'utf8');
    const ms = (name: string) => {
      const m = css.match(new RegExp(`--transition-duration-${name}:\\s*([\\d.]+)(m?s);`));
      if (!m) return null;
      return Number(m[1]) * (m[2] === 's' ? 1000 : 1);
    };
    expect({
      react: ms('react'),
      move: ms('move'),
      slow: ms('slow'),
      drift: ms('drift'),
    }).toEqual(MOTION);
    expect(css).toContain(`--ease-out: ${EASE_OUT};`);
  });

  it('押したときの縮みは 95%。幅いっぱいの曲の行だけ 98%', () => {
    expect(offenders((l) => /(?<!group-)active:scale-(?!95\b|98\b)/.test(l))).toEqual([]);
  });

  it('すりガラスの地は bg-glass だけ（bg-sidebar の透け具合を個別に書かない）', () => {
    expect(offenders((l) => /bg-sidebar\/\d/.test(l))).toEqual([]);
  });

  it('縁の線は border-line/60（透けない border-line は使わない）', () => {
    expect(offenders((l) => /\b(border|ring)-line(?!\/)/.test(l))).toEqual([]);
  });

  it('表紙（aspect-video）の角は、行の中の小さな表紙 rounded・札 rounded-xl・大きな表紙と動画 rounded-2xl', () => {
    expect(offenders((l) => /aspect-video/.test(l) && /\brounded-(md|lg|sm)\b/.test(l))).toEqual(
      [],
    );
  });

  it('丸いボタンの形は button-styles.ts から選ぶ（書き起こさない）', () => {
    expect(
      offenders(
        (l) =>
          /\bsize-(8|9|10)\b/.test(l) && /place-items-center/.test(l) && /rounded-full/.test(l),
        [
          'components/button-styles.ts',
          // ログインしている人の頭文字の丸。押せる部品ではない
          'components/account/account-button.tsx',
        ],
      ),
    ).toEqual([]);
  });

  // 寸法・重なりの順・色・画面の幅の区切りも、名前を付けて1か所に置く（2026-10-11 に本人と決めた）。
  // className に直接書いた [...] は eslint-plugin-tailwindcss が見る。ここでは、文字列の定数とそれ以外の書き方を見る
  it('[...] に数字をじかに書かない（globals.css の @theme に名前を付けて使う）', () => {
    expect(offenders((l) => /(?<![\w&[-])(?!data-|aria-)[a-z][\w:-]*-\[[^\]]*\d/.test(l))).toEqual(
      [],
    );
  });

  it('重なりの順は z-raised などの名前だけ（数字を書かない）', () => {
    expect(offenders((l) => /(?<![\w-])-?z-\d/.test(l))).toEqual([]);
  });

  it('色の値は colors.ts とキャラの色の表にだけ書く', () => {
    expect(
      offenders(
        (l) => /#[0-9a-fA-F]{6}\b/.test(l),
        ['lib/colors.ts', 'lib/voice-color.ts', 'components/theme/voice.ts'],
      ),
    ).toEqual([]);
  });

  it('画面の幅の区切りは breakpoints.ts から組み立てる', () => {
    expect(offenders((l) => /\((min|max)-width:\s*\d/.test(l))).toEqual([]);
  });

  it('globals.css の位置の計算は @theme の名前から組み立てる（rem・px をじかに書かない）', () => {
    const css = readFileSync(join(ROOT, 'app', 'globals.css'), 'utf8').split('\n');
    const raw = css.flatMap((line, i) =>
      /^\s*(--|\*|\/\*)/.test(line) || !/calc\(/.test(line) || !/\d(rem|px)\b/.test(line)
        ? []
        : [`app/globals.css:${i + 1}`],
    );
    expect(raw).toEqual([]);
  });

  it('colors.ts の色は globals.css と同じ値', () => {
    const css = readFileSync(join(ROOT, 'app', 'globals.css'), 'utf8');
    for (const [name, value] of [
      ['--miku', COLORS.miku],
      ['--accent', COLORS.accentLight],
      ['--background', COLORS.lightBg],
      ['--background', COLORS.darkBg],
      ['--foreground', COLORS.ink],
      ['--muted', COLORS.muted],
    ]) {
      expect(css).toContain(`${name}: ${value};`);
    }
  });

  it('breakpoints.ts の区切りは Tailwind と同じ値', () => {
    const theme = readFileSync(
      join(import.meta.dirname, '..', 'node_modules', 'tailwindcss', 'theme.css'),
      'utf8',
    );
    for (const [name, value] of Object.entries(BREAKPOINTS)) {
      expect(theme).toContain(`--breakpoint-${name}: ${value};`);
    }
  });

  it('@theme の同じ種類の中に、同じ値の名前を2つ作らない（同じ値で残すときは var() で片方を指す）', () => {
    const css = readFileSync(join(ROOT, 'app', 'globals.css'), 'utf8');
    const kinds = [
      '--spacing-',
      '--z-index-',
      '--transition-duration-',
      '--text-',
      '--tracking-',
      '--grid-template-columns-',
      '--grid-auto-columns-',
      '--max-height-',
      '--color-',
      '--animate-',
    ];
    const seen = new Map<string, string>();
    const dupes: string[] = [];
    for (const [, name, value] of css.matchAll(/^\s*(--[\w-]+):\s*([^;]+);/gm)) {
      const kind = kinds.find((k) => name.startsWith(k));
      if (!kind || value.trim().startsWith('var(')) continue;
      const key = `${kind}${value.trim()}`;
      const first = seen.get(key);
      if (first && first !== name) dupes.push(`${first} と ${name}（${value.trim()}）`);
      else seen.set(key, name);
    }
    expect(dupes).toEqual([]);
  });
});
