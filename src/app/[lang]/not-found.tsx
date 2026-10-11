import type { Metadata } from 'next';
import { NotFoundView } from './not-found-view';

// not-found.tsx は params を受け取れないので、題名は日本語のまま（英語の画面でも、中身は NotFoundView が英語で出す）
export const metadata: Metadata = { title: 'ページが見つかりません' };

/** 無いボカロPや曲の住所、打ち間違えた住所で来たとき。取り下げの依頼で外したボカロPもここに来る */
export default function NotFound() {
  return <NotFoundView />;
}
