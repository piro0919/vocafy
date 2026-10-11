'use client';

import { createContext, type ReactNode, useCallback, useContext } from 'react';
import { useLang } from '@/i18n/navigation';
import { displayTitle, type DisplayTitle, type EnglishTitle } from '@/lib/english-name';
import { producerName, type ProducerNames } from '@/lib/producer-name';

const Producers = createContext<ProducerNames | null>(null);

/** ボカロPの英語の名前の表を、ブラウザの部品に渡す（[lang]/layout.tsx。日本語の画面では null で、名前をそのまま出す） */
export function ProducerNamesProvider({
  names,
  children,
}: {
  names: ProducerNames | null;
  children: ReactNode;
}) {
  return <Producers.Provider value={names}>{children}</Producers.Provider>;
}

/** ブラウザの部品で、ボカロPの名前をいまの画面の言語で出す（producer-name.ts） */
export function useProducerName(): (id: number, name: string) => string {
  const names = useContext(Producers);
  return useCallback((id, name) => producerName(id, name, names), [names]);
}

/** ブラウザの部品で、曲名をいまの画面の言語で出す形にする */
export function useSongTitle(): (song: { title: string; en?: EnglishTitle }) => DisplayTitle {
  const lang = useLang();
  return useCallback((song) => displayTitle(song, lang), [lang]);
}

/**
 * 曲名を出す。英語の画面では英語の名前を出し、英語の訳は指を乗せたときに出す。
 * 形は日本語の画面と変えない（字の大きさと太さは置く側のもの）
 */
export function SongTitleText({ song }: { song: { title: string; en?: EnglishTitle } }) {
  const title = useSongTitle()(song);
  return <span title={title.sub}>{title.main}</span>;
}
