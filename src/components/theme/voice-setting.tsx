'use client';

import { useSyncExternalStore } from 'react';
import { CharacterFace } from '../browse-cards';
import { Heading, SECTION } from '../heading';
import { readVoice, setVoice, subscribeVoice, VOICES } from './voice';

/** 設定の画面のサイトカラー（キャラの色）の選択。選んだ時点で切り替わり、このブラウザに残る */
export function VoiceSetting() {
  const voice = useSyncExternalStore(subscribeVoice, readVoice, () => 'miku' as const);
  return (
    <section className={SECTION}>
      <div className="mb-3">
        <Heading id="voice-setting" eyebrow="Color">
          サイトカラー
        </Heading>
      </div>
      {/* 札はトップの歌声の区画と同じ見た目。9人なので、どの幅でも3列の3段にそろえる。
          パソコンでは画面の幅のままだと札がトップの倍ほどになるので、格子の幅を絞ってトップの札の大きさに合わせる */}
      <div
        role="radiogroup"
        aria-labelledby="voice-setting"
        className="grid grid-cols-3 gap-x-2.5 gap-y-3 sm:max-w-sm sm:gap-y-4"
      >
        {VOICES.map((o) => (
          <label
            key={o.value}
            style={{ '--c': o.color } as React.CSSProperties}
            className="group relative flex cursor-pointer flex-col rounded-2xl transition-[scale] duration-150 ease-(--ease-out) active:scale-95 has-focus-visible:outline-2 has-focus-visible:outline-offset-4 has-focus-visible:outline-accent"
          >
            <input
              type="radio"
              name="voice"
              value={o.value}
              checked={voice === o.value}
              onChange={() => setVoice(o.value)}
              className="sr-only"
            />
            <CharacterFace
              name={o.label}
              art={`/characters/${o.art}.webp`}
              selected={voice === o.value}
            />
          </label>
        ))}
      </div>
    </section>
  );
}
