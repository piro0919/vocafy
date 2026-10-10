import Link from 'next/link';
import type { ProducerLinks as Links } from '@/lib/catalog';
import { FadeImage } from './fade-image';
import { FavoriteProducerButton } from './favorite-button';
import { Heading } from './heading';
import { ProducerLinks } from './producer-links';

/**
 * ボカロPの題名。アイコン・名前・お気に入りのハートと、名前の下の本人の場所（X など）。
 * ボカロPの画面（producer-view.tsx）と、動画を大きく出すほかの画面で流している曲のボカロP（stage-heading.tsx）の両方で使う。
 * 同じ部品にしておくと、名前を押してボカロPの画面へ移ったときに、アイコン・名前・下の「再生」の段の位置がずれない
 * （2026-10-11。2か所に別々に書いていたころは、数 px ずれた）。
 * picture と links が undefined のときは取りに行っている途中で、同じ大きさの空きを取っておく（届いたときに下の段が動かない）。
 * link を付けると、アイコンと名前がそのボカロPの画面へのリンクになる
 */
export function ProducerHeading({
  id,
  name,
  picture,
  links,
  as = 'h1',
  link = false,
  onFollow,
}: {
  id: number;
  name: string;
  /** null は画像の無い人、undefined は取りに行っている途中 */
  picture: string | null | undefined;
  /** undefined は取りに行っている途中 */
  links: Links | undefined;
  as?: 'h1' | 'h2';
  link?: boolean;
  /** link のときに、押してボカロPの画面へ移る直前に呼ぶ（並びをそのボカロPの曲にする。stage-heading.tsx） */
  onFollow?: () => void;
}) {
  const icon =
    picture === undefined ? (
      <span className="block size-12 shrink-0 rounded-full bg-surface sm:size-14" />
    ) : picture ? (
      <FadeImage
        src={picture}
        alt=""
        width={56}
        height={56}
        className="size-12 shrink-0 rounded-full bg-surface object-cover sm:size-14"
      />
    ) : null;
  // スマホでは、動画の下に名前とボタンを詰めて置くので、ほかの画面の題名より小さくする
  const title = (
    <Heading as={as} size="page" className="max-sm:text-2xl">
      {name}
    </Heading>
  );
  const hover = 'transition-opacity duration-react hover:opacity-80';
  return (
    <div className="flex items-center gap-3">
      {icon &&
        (link ? (
          <Link
            href={`/producers/${id}`}
            onClick={onFollow}
            aria-label={name}
            className={`shrink-0 ${hover}`}
          >
            {icon}
          </Link>
        ) : (
          icon
        ))}
      <div className="min-w-0">
        <div className="flex items-center gap-3">
          {link ? (
            <Link href={`/producers/${id}`} onClick={onFollow} className={`min-w-0 ${hover}`}>
              {title}
            </Link>
          ) : (
            title
          )}
          <FavoriteProducerButton producer={{ id, name, picture: picture ?? null }} />
        </div>
        {/* 本人の場所は名前の下に1行で（YouTube のチャンネルの画面と同じ置き場所）。曲数は出さない（右の一覧の番号で分かり、
            名前の下・リンクの横のどこに置いても浮いた）。取りに行っている途中は、リンクのボタンと同じ高さ（36px）の空き */}
        {links === undefined ? (
          <div className="h-9" />
        ) : (
          <ProducerLinks name={name} links={links} />
        )}
      </div>
    </div>
  );
}
