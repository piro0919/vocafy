/**
 * 曲名の頭の文字で引く索引（あいうえお順）。取り込み（scripts/ingest.ts）が曲ごとに行を決めて DB に書き、
 * サイトはその行で曲を引く。DB にも VocaDB にも触らないので、テストから確かめられる
 */

/** 索引の行。かなの10行と、英字・数字で始まる曲（abc）と、それ以外（etc） */
export const ROWS = [
  'あ',
  'か',
  'さ',
  'た',
  'な',
  'は',
  'ま',
  'や',
  'ら',
  'わ',
  'abc',
  'etc',
] as const;
export type Row = (typeof ROWS)[number];

/** 札に出す字 */
export const ROW_LABEL: Record<Row, string> = {
  あ: 'あ',
  か: 'か',
  さ: 'さ',
  た: 'た',
  な: 'な',
  は: 'は',
  ま: 'ま',
  や: 'や',
  ら: 'ら',
  わ: 'わ',
  abc: 'ABC',
  etc: 'ほか',
};

export function isRow(value: string): value is Row {
  return (ROWS as readonly string[]).includes(value);
}

/** ひらがなの行。濁点・半濁点・小さい字も、元の字の行に入れる */
const KANA: [Row, string][] = [
  ['あ', 'あいうえおぁぃぅぇぉゔ'],
  ['か', 'かきくけこがぎぐげごゕゖ'],
  ['さ', 'さしすせそざじずぜぞ'],
  ['た', 'たちつてとだぢづでどっ'],
  ['な', 'なにぬねの'],
  ['は', 'はひふへほばびぶべぼぱぴぷぺぽ'],
  ['ま', 'まみむめも'],
  ['や', 'やゆよゃゅょ'],
  ['ら', 'らりるれろ'],
  ['わ', 'わをんゎゐゑ'],
];

/** ローマ字の頭の字から行を決める。ch・sh・ts・j なども、頭の1字で行が決まる */
const ROMAJI: Record<string, Row> = {
  a: 'あ',
  i: 'あ',
  u: 'あ',
  e: 'あ',
  o: 'あ',
  v: 'あ',
  k: 'か',
  g: 'か',
  q: 'か',
  s: 'さ',
  z: 'さ',
  j: 'さ',
  t: 'た',
  d: 'た',
  c: 'た',
  n: 'な',
  h: 'は',
  b: 'は',
  p: 'は',
  f: 'は',
  m: 'ま',
  y: 'や',
  r: 'ら',
  l: 'ら',
  w: 'わ',
};

/** 頭の記号や空白、長音（ー）を飛ばした、最初の字 */
function head(text: string): string | undefined {
  return text.normalize('NFKC').match(/[\p{L}\p{N}]/u)?.[0];
}

/** カタカナをひらがなにする */
const toHiragana = (c: string) =>
  c >= 'ァ' && c <= 'ヶ' ? String.fromCharCode(c.charCodeAt(0) - 0x60) : c;

/**
 * 曲名の行。かなで始まればその行、英字か数字で始まれば abc。漢字で始まる曲名は読みが分からないので、
 * VocaDB のローマ字の曲名（romaji）の頭の字で決める。ローマ字が無いときや、ほかの文字は etc
 */
export function rowOf(title: string, romaji?: string): Row {
  const c = head(title);
  if (!c) return 'etc';
  const kana = toHiragana(c);
  const found = KANA.find(([, chars]) => chars.includes(kana));
  if (found) return found[0];
  if (/[a-z0-9]/i.test(c)) return 'abc';
  if (/\p{Script=Han}/u.test(c) && romaji) {
    const r = head(romaji)?.toLowerCase();
    return (r && ROMAJI[r]) || 'etc';
  }
  return 'etc';
}
