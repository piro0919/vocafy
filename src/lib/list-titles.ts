import type { Lang } from '@/i18n/config';
import { defineText } from '@/i18n/text';
import { TERMS } from '@/i18n/terms';

const TEXT = defineText({
  ja: {
    bornOn: (label: string) => `${label}に生まれた曲`,
    month: (year: string, month: number) => `${year}年${month}月の曲`,
    voiceYear: (name: string, year: string) => `${name}の${year}年の曲`,
  },
  en: {
    bornOn: (label: string) => `Born on ${label}`,
    month: (year: string, month: number) => `Songs from ${TERMS.en.yearMonth(year, month)}`,
    voiceYear: (name: string, year: string) => `${name} in ${year}`,
  },
});

/** 「10-09」→「10月9日」（英語は「October 9」）。日付の一覧の画面と、その再生用の画面（/play）で同じものを使う */
function dayLabel(day: string, lang: Lang): string {
  const [m, d] = day.split('-').map(Number);
  return TERMS[lang].monthDay(m, d);
}

/** 日付の一覧の題名。「10月9日に生まれた曲」（英語は「Born on October 9」）。トップのきょうの日付の曲の区画にも使う */
export function dayTitle(day: string, lang: Lang): string {
  return TEXT[lang].bornOn(dayLabel(day, lang));
}

/** 月の一覧の題名。「2010年3月の曲」。月の画面と、その再生用の画面（/play）で同じものを使う */
export function monthTitle(year: string, month: number, lang: Lang): string {
  return TEXT[lang].month(year, month);
}

/** 歌声の年の一覧の題名。「初音ミクの2010年の曲」。name は画面に出す形の名前（voice-name.ts） */
export function voiceYearTitle(name: string, year: string, lang: Lang): string {
  return TEXT[lang].voiceYear(name, year);
}

/**
 * 一覧の再生用の画面の小さな英字。全曲から選んだ曲を流すときは PICKUP を添える（「2026 PICKUP」「ON THIS DAY PICKUP」）。
 * 曲数を出さないので、並んでいるのが全曲の一部だと分かる手がかりにする。「PICKUP FROM 2026」の形は、日付の一覧で不自然になる
 */
export function withPickup(eyebrow: string, pickup: boolean): string {
  return pickup ? `${eyebrow} PICKUP` : eyebrow;
}
