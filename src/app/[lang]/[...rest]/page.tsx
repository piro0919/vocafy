import { notFound } from 'next/navigation';

/**
 * どのページにも当たらない住所。言語の枠（[lang]/layout.tsx）の中で「見つかりません」を出す。
 * 題名を作る処理でも見つからない扱いにする。しないと、見つからない画面のタブの題名が、あとから「Vocafy」に置き換わった
 */
export function generateMetadata() {
  notFound();
}

export default function Rest() {
  notFound();
}
