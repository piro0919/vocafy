/**
 * 曲名の頭の文字で引く索引（あいうえお順）。取り込み（scripts/ingest.ts）が曲ごとに行を決めて DB に書き、
 * サイトはその行で曲を引く。DB にも VocaDB にも触らないので、テストから確かめられる
 */

/** 索引のかなの10行 */
export const KANA_ROWS = ['あ', 'か', 'さ', 'た', 'な', 'は', 'ま', 'や', 'ら', 'わ'] as const;
/** 英字で始まる曲の行。かなの行と同じく5字ずつまとめる */
export const LATIN_ROWS = ['a-e', 'f-j', 'k-o', 'p-t', 'u-z'] as const;
/** 数字で始まる曲と、それ以外（etc） */
export const OTHER_ROWS = ['0-9', 'etc'] as const;

/** 索引の行。トップでは、かな・英字・そのほかの3段に分けて並べる */
export const ROWS = [...KANA_ROWS, ...LATIN_ROWS, ...OTHER_ROWS] as const;
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
  'a-e': 'A–E',
  'f-j': 'F–J',
  'k-o': 'K–O',
  'p-t': 'P–T',
  'u-z': 'U–Z',
  '0-9': '0–9',
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
 * 曲名の行。かなで始まればその行、英字で始まれば5字ずつの行（a-e など）、数字で始まれば 0-9。漢字で始まる曲名は読みが分からないので、
 * VocaDB のローマ字の曲名（romaji）の頭の字で決める。ローマ字が無いときや、ほかの文字は etc
 */
export function rowOf(title: string, romaji?: string): Row {
  const c = head(title);
  if (!c) return 'etc';
  const kana = toHiragana(c);
  const found = KANA.find(([, chars]) => chars.includes(kana));
  if (found) return found[0];
  if (/[0-9]/.test(c)) return '0-9';
  // É や Å のような飾りの付いた字は、元の字の行に入れる
  const latin = c.normalize('NFD')[0]?.toLowerCase();
  if (latin && /[a-z]/.test(latin)) return LATIN_ROWS.find((r) => latin <= r[2]) ?? 'u-z';
  if (/\p{Script=Han}/u.test(c) && romaji) {
    const r = head(romaji)?.toLowerCase();
    return (r && ROMAJI[r]) || 'etc';
  }
  return 'etc';
}
