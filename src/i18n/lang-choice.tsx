'use client';

import { usePathname as useNextPathname } from 'next/navigation';
import { useEffect } from 'react';
import { RadioOptions, SettingSection } from '@/components/setting-controls';
import { createLocalChoice } from '@/lib/local-flag';
import { DEFAULT_LANG, LANGS, langOfPath, localize, stripLang, type Lang } from './config';
import { useLang } from './navigation';

/** 設定の画面で選んだ言語。日本語（既定）を選んだときは何も残さない */
const choice = createLocalChoice<Lang>({
  key: 'vocafy-lang',
  values: LANGS,
  fallback: DEFAULT_LANG,
  event: 'vocafy-lang-change',
});

/**
 * 言語を変えて移るときは、ページを読み込み直す。言語は画面の一番外側の枠（[lang]/layout.tsx の <html>）から変わるので、
 * 画面の中で移ると <html> が作り直され、描く前に付けたテーマとサイトカラーの印（theme-script.ts の data-theme・data-voice）が
 * 外れていた（2026-10-12 に本人が見つけた）。枠ごと作り直すので再生も止まり、読み込み直して失うものは無い
 */

/** いまの住所を、別の言語の同じ画面の住所にする（?以降も残す） */
function sameScreenIn(lang: Lang): string {
  return localize(stripLang(location.pathname), lang) + location.search;
}

/**
 * 英語を選んだ人が日本語の住所（共有されたリンクなど）を開いたら、英語の同じ画面へ移す。ブラウザの中で移すので、
 * 移る前に一瞬だけ日本語の画面が見える（2026-10-12 に本人と決めた。サーバーで見分けると proxy を全部の住所で動かすことになり、料金が増える）。
 * ブラウザの言語は見ない。選んだ人だけを移す
 */
export function LangRedirect() {
  const pathname = useNextPathname();
  useEffect(() => {
    if (langOfPath(location.pathname) === DEFAULT_LANG && choice.read() !== DEFAULT_LANG) {
      location.replace(sameScreenIn(choice.read()));
    }
  }, [pathname]);
  return null;
}

/** 選択肢の名前は、どちらの言語の画面でもその言語で書く（読めない言語の画面からでも見つけられるように） */
const OPTIONS: { value: Lang; label: string }[] = [
  { value: 'ja', label: '日本語' },
  { value: 'en', label: 'English' },
];

/** 設定の画面の言語の選択。読めない言語の画面からも見つけられるよう、一番上に置く。選ぶと残して、いまの画面のその言語の住所へ移る */
export function LangSetting() {
  const lang = useLang();
  const change = (next: Lang) => {
    choice.save(next);
    choice.notify();
    location.assign(sameScreenIn(next));
  };
  return (
    <SettingSection eyebrow="Language" title={lang === 'en' ? 'Language' : '言語'} first>
      {(id) => (
        <RadioOptions
          name="lang"
          labelledBy={id}
          options={OPTIONS}
          value={lang}
          onChange={change}
        />
      )}
    </SettingSection>
  );
}
