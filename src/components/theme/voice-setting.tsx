'use client';

import Image from 'next/image';
import { useSyncExternalStore } from 'react';
import { readVoice, setVoice, subscribeVoice, VOICES } from './voice';

/** 設定の画面のキャラの色の選択。選んだ時点で切り替わり、このブラウザに残る */
export function VoiceSetting() {
  const voice = useSyncExternalStore(subscribeVoice, readVoice, () => 'miku' as const);
  return (
    <fieldset className="mt-7 sm:mt-10">
      <legend className="mb-3 font-bold">キャラの色</legend>
      <div className="grid grid-cols-4 gap-2">
        {VOICES.map((o) => {
          const selected = voice === o.value;
          return (
            <label
              key={o.value}
              style={{ borderColor: selected ? o.color : undefined }}
              className="flex cursor-pointer flex-col items-center gap-1 rounded-xl border-2 border-transparent px-1 pt-2 pb-2.5 transition-colors duration-150 hover:bg-foreground/8 has-focus-visible:outline-2 has-focus-visible:outline-accent"
            >
              <input
                type="radio"
                name="voice"
                value={o.value}
                checked={selected}
                onChange={() => setVoice(o.value)}
                className="sr-only"
              />
              <Image
                src={`/characters/${o.art}.webp`}
                alt=""
                width={64}
                height={64}
                unoptimized
                className="size-16 object-contain"
              />
              <span className="text-xs">{o.label}</span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
