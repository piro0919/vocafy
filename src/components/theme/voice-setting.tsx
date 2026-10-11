'use client';

import { useSyncExternalStore } from 'react';
import { CharacterFace } from '../browse-cards';
import { Heading, SECTION } from '../heading';
import { CheckRow } from '../setting-controls';
import {
  readFollowVoice,
  readVoice,
  readVoicePool,
  setFollowVoice,
  setVoice,
  setVoicePool,
  subscribeVoice,
  type Voice,
  VOICES,
  voicePoolOf,
} from './voice';
import { defineText } from '@/i18n/text';
import { useText } from '@/i18n/navigation';
import { useVoiceNames } from '@/components/voice-names';

const TEXT = defineText({
  ja: {
    title: 'サイトカラー',
    random: 'アクセスするたびにランダムで変える',
    follow: '再生中は、歌っているキャラに合わせる',
  },
  en: {
    title: 'Site color',
    random: 'Randomize on each visit',
    follow: 'Match the singer while playing',
  },
});

/**
 * 設定の画面のサイトカラー（キャラの色）の選択。選んだ時点で切り替わり、このブラウザに残る。
 * 開くたびに変える設定を入れているあいだは、札を複数選べる（チェックの箱）。入れたときは9人全員から始める。
 * 最後の1人は外せない。ふだんは1回押せば決まるように、複数選べるのはこの設定を入れたときだけにした（2026-10-12）
 */
export function VoiceSetting() {
  const voice = useSyncExternalStore(subscribeVoice, readVoice, () => 'miku' as const);
  const follow = useSyncExternalStore(subscribeVoice, readFollowVoice, () => true);
  const pool = voicePoolOf(useSyncExternalStore(subscribeVoice, readVoicePool, () => ''));
  const random = pool.length > 0;
  const toggle = (v: Voice) =>
    setVoicePool(pool.includes(v) ? pool.filter((p) => p !== v) : [...pool, v]);
  const t = useText(TEXT);
  const voices = useVoiceNames();
  return (
    <section className={SECTION}>
      <div className="mb-3">
        <Heading id="voice-setting" eyebrow="Color">
          {t.title}
        </Heading>
      </div>
      {/* 札はトップの歌声の区画と同じ見た目。9人なので、どの幅でも3列の3段にそろえる。
          パソコンでは画面の幅のままだと札がトップの倍ほどになるので、格子の幅を絞ってトップの札の大きさに合わせる */}
      <div
        role={random ? 'group' : 'radiogroup'}
        aria-labelledby="voice-setting"
        className="grid grid-cols-3 gap-x-2.5 gap-y-3 sm:max-w-sm sm:gap-y-4"
      >
        {VOICES.map((o) => (
          <label
            key={o.value}
            style={{ '--c': o.color } as React.CSSProperties}
            className="group relative flex cursor-pointer flex-col rounded-2xl transition duration-react active:scale-95 has-focus-visible:outline-2 has-focus-visible:outline-offset-4 has-focus-visible:outline-accent"
          >
            {random ? (
              <input
                type="checkbox"
                value={o.value}
                checked={pool.includes(o.value)}
                disabled={pool.length === 1 && pool.includes(o.value)}
                onChange={() => toggle(o.value)}
                className="sr-only"
              />
            ) : (
              <input
                type="radio"
                name="voice"
                value={o.value}
                checked={voice === o.value}
                onChange={() => setVoice(o.value)}
                className="sr-only"
              />
            )}
            <CharacterFace
              name={voices.name(o.label)}
              art={`/characters/${o.art}.webp`}
              selected={random ? pool.includes(o.value) : voice === o.value}
            />
          </label>
        ))}
      </div>
      <CheckRow
        checked={random}
        onChange={(on) => setVoicePool(on ? VOICES.map((o) => o.value) : [])}
        className="mt-4"
      >
        {t.random}
      </CheckRow>
      <CheckRow checked={follow} onChange={setFollowVoice}>
        {t.follow}
      </CheckRow>
    </section>
  );
}
