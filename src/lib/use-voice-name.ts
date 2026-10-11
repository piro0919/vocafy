'use client';

import { useMemo } from 'react';
import { useLang } from '@/i18n/navigation';
import { voiceName, voiceNamesText } from './voice-name';

/** ブラウザの部品で、歌声の名前をいまの画面の言語で出す（voice-name.ts） */
export function useVoiceNames() {
  const lang = useLang();
  return useMemo(
    () => ({
      name: (name: string) => voiceName(name, lang),
      text: (vocalists: string) => voiceNamesText(vocalists, lang),
    }),
    [lang],
  );
}
