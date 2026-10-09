import { SUPPORT_URL } from '@/lib/site';
import { PILL } from './button-styles';
import { Heading, SECTION } from './heading';

/**
 * 設定の画面の一番下の「Vocafy を支援」の欄（2026-10-10 に本人と決めた）。並んでいるのは他人の曲と動画なので、
 * 支援を頼む文は目立たせず、サイトを気に入って設定まで触る人にだけ届く場所に置く。トップの下の段には置かない
 */
export function SupportLink() {
  return (
    <section className={SECTION}>
      <div className="mb-3">
        <Heading eyebrow="Support">Vocafy を支援</Heading>
      </div>
      <a
        href={SUPPORT_URL}
        target="_blank"
        rel="noopener noreferrer"
        className={`inline-block ${PILL}`}
      >
        Buy Me a Coffee
      </a>
    </section>
  );
}
