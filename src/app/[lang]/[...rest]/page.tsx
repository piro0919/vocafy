import { notFound } from 'next/navigation';

/** どのページにも当たらない住所。言語の枠（[lang]/layout.tsx）の中で「見つかりません」を出す */
export default function Rest() {
  notFound();
}
