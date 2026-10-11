import type { Metadata } from 'next';
import { lang } from 'next/root-params';
import { DEFAULT_LANG, isLang } from '@/i18n/config';
import { NOT_FOUND_TEXT } from './not-found-text';
import { NotFoundView } from './not-found-view';

/** タブの題名。not-found.tsx は params を受け取れないので、言語は住所の頭の言語（root params）から読む */
export async function generateMetadata(): Promise<Metadata> {
  const value = await lang();
  return { title: NOT_FOUND_TEXT[isLang(value) ? value : DEFAULT_LANG].title };
}

/** 無いボカロPや曲の住所、打ち間違えた住所で来たとき。取り下げの依頼で外したボカロPもここに来る */
export default function NotFound() {
  return <NotFoundView />;
}
