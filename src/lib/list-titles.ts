import type { Lang } from '@/i18n/config';
import { defineText } from '@/i18n/text';
import { TERMS } from '@/i18n/terms';

const TEXT = defineText({
  ja: { bornOn: (label: string) => `${label}に生まれた曲` },
  en: { bornOn: (label: string) => `Born on ${label}` },
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

/**
 * 一覧の再生用の画面の小さな英字。全曲から選んだ曲を流すときは PICKUP を添える（「2026 PICKUP」「ON THIS DAY PICKUP」）。
 * 曲数を出さないので、並んでいるのが全曲の一部だと分かる手がかりにする。「PICKUP FROM 2026」の形は、日付の一覧で不自然になる
 */
export function withPickup(eyebrow: string, pickup: boolean): string {
  return pickup ? `${eyebrow} PICKUP` : eyebrow;
}
