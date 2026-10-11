import { defineText } from '@/i18n/text';

/** 「見つかりません」の文言。画面の中身（not-found-view.tsx）とタブの題名（not-found.tsx）で使う */
export const NOT_FOUND_TEXT = defineText({
  ja: {
    title: 'ページが見つかりません',
    body: 'お探しのページは存在しないか、掲載をやめた可能性があります。',
    home: 'ホームへ',
  },
  en: {
    title: 'Page not found',
    body: 'This page doesn’t exist or is no longer available.',
    home: 'Go home',
  },
});
