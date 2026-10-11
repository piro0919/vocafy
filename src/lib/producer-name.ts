/** ボカロPの番号から英語の名前を引く表。日本語の画面では null（producer-names.ts の producerNamesFor） */
export type ProducerNames = Readonly<Record<number, string>>;

/**
 * 画面に出すボカロPの名前（2026-10-12 に本人と決めた）。英語の画面では VocaDB の英語の名前、無ければローマ字の名前にする
 * （取り込みが producer.name_en に入れる）。どちらも無い人は日本語のまま。日本語の名前は添えない
 */
export function producerName(id: number, name: string, names: ProducerNames | null): string {
  return names?.[id] ?? name;
}
