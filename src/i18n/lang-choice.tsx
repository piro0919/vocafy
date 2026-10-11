'use client';

import { useRouter as useProgressRouter } from '@bprogress/next/app';
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
  const router = useProgressRouter();
  const pathname = useNextPathname();
  useEffect(() => {
    if (langOfPath(location.pathname) === DEFAULT_LANG && choice.read() !== DEFAULT_LANG) {
      router.replace(sameScreenIn(choice.read()), { showProgress: false });
    }
  }, [pathname, router]);
  return null;
}

/** 選択肢の名前は、どちらの言語の画面でもその言語で書く（読めない言語の画面からでも見つけられるように） */
const OPTIONS: { value: Lang; label: string }[] = [
  { value: 'ja', label: '日本語' },
  { value: 'en', label: 'English' },
];

/** 設定の画面の言語の選択。選ぶと残して、いまの画面のその言語の住所へ移る */
export function LangSetting() {
  const lang = useLang();
  const router = useProgressRouter();
  const change = (next: Lang) => {
    choice.save(next);
    choice.notify();
    router.push(sameScreenIn(next));
  };
  return (
    <SettingSection eyebrow="Language" title={lang === 'en' ? 'Language' : '言語'}>
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
