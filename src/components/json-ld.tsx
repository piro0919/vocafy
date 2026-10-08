import type { Thing, WithContext } from 'schema-dts';

/**
 * 検索エンジン向けの構造化データ（JSON-LD）。画面には何も出ない。
 * 中身に < が入っても script を抜け出さないよう、Next.js の手引きどおり < に置き換える
 */
export function JsonLd<T extends Thing>({ data }: { data: WithContext<T> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }}
    />
  );
}
