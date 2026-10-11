'use client';

import { createContext, type ReactNode, useContext, useMemo } from 'react';
import { voiceName, voiceNamesText, type VoiceNames } from '@/lib/voice-name';

const Names = createContext<VoiceNames | null>(null);

/** 歌声の英語の名前の表を、ブラウザの部品に渡す（[lang]/layout.tsx。日本語の画面では null で、名前をそのまま出す） */
export function VoiceNamesProvider({
  names,
  children,
}: {
  names: VoiceNames | null;
  children: ReactNode;
}) {
  return <Names.Provider value={names}>{children}</Names.Provider>;
}

/** ブラウザの部品で、歌声の名前をいまの画面の言語で出す（voice-name.ts） */
export function useVoiceNames() {
  const names = useContext(Names);
  return useMemo(
    () => ({
      name: (name: string) => voiceName(name, names),
      text: (vocalists: string) => voiceNamesText(vocalists, names),
    }),
    [names],
  );
}
