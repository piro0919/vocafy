import Link from 'next/link';
import { FadeImage } from './fade-image';
import { NowPlaying } from './now-playing';

// YouTube のサムネイルは加工せずに出す（規約）。16:9 の mqdefault を 16:9 の枠に入れるので、端は切れない。
// アーティストのカード（round）は、YouTube のチャンネルのアイコンを丸く出す。公式のチャンネルが無いアーティストは名前の頭の1字。
// 押すと詳しい画面へ移る
export function CoverCard({
  href,
  cover,
  title,
  sub,
  eager,
  playing,
  round,
  className = '',
}: {
  href: string;
  cover: string | null;
  title: string;
  sub?: string;
  /** 最初の行は画面に入った時点で見えるので、遅延読み込みにしない */
  eager?: boolean;
  /** いま流している曲がこのボカロPのものなら、題名の横に印を出す */
  playing?: { producerId: number };
  /** アーティストのカード。cover にチャンネルのアイコンを渡し、丸く出す */
  round?: boolean;
  className?: string;
}) {
  return (
    // 再生ボタンはリンクの中に入れられない（a の中に button は置けない）ので、リンクの外に重ねる
    <div
      // マウスを載せたら、人気曲の行と同じく、サムネイルと題名を含むカード全体の地を変える。
      // 地の余白（p-2）の分だけ外へ広げ（-m-2）、並びの位置は変えない
      className={`group relative -m-2 rounded-lg p-2 transition-colors duration-150 hover:bg-foreground/8 ${className}`}
    >
      <Link href={href} className="block">
        {round ? (
          <div className="relative aspect-square overflow-hidden rounded-full bg-surface">
            {cover ? (
              // 幅を決め打ちにして、画像の候補を普通の画面用と高精細の画面用の2通りだけにする。
              // fill と sizes で書くと幅の候補が11通り並び、461 人の一覧では候補の住所だけで HTML が 0.5MB になった。
              // 枠は最大 180px ほどなので、192 を基準にする
              <FadeImage
                src={cover}
                alt=""
                width={192}
                height={192}
                loading={eager ? 'eager' : 'lazy'}
                className="size-full object-cover"
              />
            ) : (
              <span
                aria-hidden
                className="grid size-full place-items-center font-display text-4xl font-extrabold text-muted"
              >
                {[...title][0]}
              </span>
            )}
          </div>
        ) : (
          <div className="relative aspect-video overflow-hidden rounded-xl bg-surface">
            {cover && (
              <FadeImage
                src={cover}
                alt=""
                fill
                loading={eager ? 'eager' : 'lazy'}
                sizes="(min-width: 1024px) 240px, (min-width: 640px) 33vw, 50vw"
                className="object-cover"
              />
            )}
          </div>
        )}
        <p
          className={`mt-2 flex items-center gap-1.5 text-sm font-bold ${round ? 'justify-center' : ''}`}
        >
          <span className="truncate">{title}</span>
          {playing && <NowPlaying {...playing} />}
        </p>
        {sub && (
          <p className={`truncate text-xs text-muted ${round ? 'text-center' : ''}`}>{sub}</p>
        )}
      </Link>
    </div>
  );
}

/** アーティストの格子。丸いアイコンは背が高いので、カードの格子より列を増やす */
export const ARTIST_GRID =
  'grid grid-cols-3 gap-x-4 gap-y-6 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6';
