import { createRequire } from 'node:module';
import path from 'node:path';
import kuromoji from 'kuromoji';

/**
 * 曲名の読み（カタカナ）を、形態素解析の辞書（kuromoji の IPAdic）で当てる。
 * VocaDB にローマ字の曲名が無い、漢字で始まる曲のあいうえお順の行を決めるのに使う（src/lib/kana.ts の rowOf）。
 * 2026-10-09 に、ローマ字のある漢字の曲 6569 曲で行を比べて 92% が一致した。外れるのは、天ノ弱（あまのじゃく）や
 * 重音テト（かさね）のような、辞書に無い読み。読めない字は字のまま返すので、その曲は「ほか」に残る
 */
export async function readingOf(): Promise<(title: string) => string> {
  const dicPath = path.join(
    path.dirname(createRequire(import.meta.url).resolve('kuromoji/package.json')),
    'dict',
  );
  const tokenizer = await new Promise<kuromoji.Tokenizer<kuromoji.IpadicFeatures>>((ok, ng) =>
    kuromoji.builder({ dicPath }).build((error, t) => (error ? ng(error) : ok(t))),
  );
  return (title) =>
    tokenizer
      .tokenize(title.normalize('NFKC'))
      .map((t) => (t.reading && t.reading !== '*' ? t.reading : t.surface_form))
      .join('');
}
