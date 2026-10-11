import { COVER_PLAY } from './button-styles';
import { FadeImage } from './fade-image';
import { Icon } from './icon';
import { defineText } from '@/i18n/text';

/** 開き直したときに戻した前の曲の「続きを再生」（player-resume.ts）。動画の場所と右下の窓の両方で使う */
export const RESUME_TEXT = defineText({
  ja: { resume: (title: string) => `「${title}」の続きを再生` },
  en: { resume: (title: string) => `Resume “${title}”` },
});

/**
 * 表紙の上に丸い再生ボタンを重ねた、押すと流れるボタン。動画の場所（流す前と、戻した前の曲）と、右下の窓（戻した前の曲）で使う。
 * 置き方と大きさは className で渡す。small は右下の窓の大きさのボタン
 */
export function CoverPlayButton({
  cover,
  label,
  onClick,
  sizes,
  className,
  small = false,
  eager = false,
}: {
  cover: string | null | undefined;
  label: string;
  onClick: () => void;
  sizes: string;
  className: string;
  small?: boolean;
  eager?: boolean;
}) {
  return (
    <button type="button" onClick={onClick} aria-label={label} className={`group ${className}`}>
      {cover && (
        <FadeImage
          src={cover}
          alt=""
          fill
          loading={eager ? 'eager' : undefined}
          // eager は詳細画面の大きな表紙だけで、その画面の LCP になる
          fetchPriority={eager ? 'high' : undefined}
          sizes={sizes}
          className="object-cover"
        />
      )}
      <span
        className={`absolute top-1/2 left-1/2 -translate-1/2 ${small ? 'size-14' : 'size-16'} ${COVER_PLAY}`}
      >
        <Icon name="play" className={small ? 'size-8' : 'size-9'} />
      </span>
    </button>
  );
}
