import type { Metadata } from 'next';
import { Link } from '@/i18n/navigation';
import { Legal } from '@/components/legal';
import { langOf } from '@/i18n/config';
import { TERMS } from '@/i18n/terms';
import { CONTACT_FORM_URL, OPERATOR } from '@/lib/site';

/** 最終更新日。英訳は日本語の版と同じ日付にそろえる */
const UPDATED = { ja: '2026年10月8日', en: 'October 8, 2026' };

export async function generateMetadata({ params }: PageProps<'/[lang]/terms'>): Promise<Metadata> {
  return { title: TERMS[await langOf(params)].terms };
}

/**
 * 本文は言語ごとに分けて書く。日本語の版が正本で、英訳と食い違うときは日本語の版が優先する
 * （英訳の頭の断り書きは legal.tsx）
 */
export default async function TermsPage({ params }: PageProps<'/[lang]/terms'>) {
  const lang = await langOf(params);
  return (
    <Legal lang={lang} title={TERMS[lang].terms} eyebrow="Terms" updated={UPDATED[lang]}>
      {lang === 'en' ? <EnTerms /> : <JaTerms />}
    </Legal>
  );
}

function JaTerms() {
  return (
    <>
      <p>
        この規約は、{OPERATOR} が運営する
        Vocafy（以下「本サイト」）の利用について定めます。本サイトを利用した時点で、この規約に同意したものとみなします。
      </p>

      <h2>本サイトについて</h2>
      <p>
        本サイトは、VOCALOID などの合成音声を使った曲を、作者が YouTube
        に公開している動画の埋め込みで聴けるようにした、個人の非公式サイトです。各作者、歌声の製品の開発元とは関係ありません。
      </p>
      <p>
        本サイトは音声や動画のファイルを保存・配信しておらず、再生はすべて YouTube
        のプレイヤーで行われます。
      </p>

      <h2>YouTube の利用</h2>
      <p>
        本サイトは YouTube API Services を使っています。本サイトを利用する方は、
        <a href="https://www.youtube.com/t/terms" target="_blank" rel="noopener noreferrer">
          YouTube 利用規約
        </a>
        にも同意したものとみなします。利用者の情報の扱いは、
        <Link href="/privacy">プライバシーポリシー</Link>
        をご覧ください。
      </p>

      <h2>権利について</h2>
      <p>
        動画・楽曲・サムネイル・作者の画像の著作権その他の権利は、それぞれの権利者に帰属します。作者名・曲名・歌声などの情報と作者の画像は、
        <a href="https://vocadb.net/" target="_blank" rel="noopener noreferrer">
          VocaDB
        </a>
        の公開情報をもとにしています。
      </p>
      <p>
        本サイトのアイコンは、
        <a
          href="https://piapro.jp/license/character_guideline"
          target="_blank"
          rel="noopener noreferrer"
        >
          ピアプロ・キャラクター・ライセンス
        </a>
        に基づいてクリプトン・フューチャー・メディア株式会社のキャラクター「初音ミク」を描いたものです。
      </p>
      <p>
        歌声の画面のキャラクターの絵は、画像生成 AI
        で作った非公式のファンアートで、公式の絵ではありません。
        各キャラクターの権利は、それぞれの権利者に帰属します。クリプトン・フューチャー・メディア株式会社のキャラクターは、
        <a
          href="https://piapro.jp/license/character_guideline"
          target="_blank"
          rel="noopener noreferrer"
        >
          ピアプロ・キャラクター・ライセンス
        </a>
        に基づいて描いています。権利者の方から取り下げのご依頼をいただいた場合は、速やかに掲載をやめます。
      </p>

      <h2>掲載の取り下げ</h2>
      <p>
        掲載している動画について、権利者の方から削除のご依頼をいただいた場合は、確認のうえ速やかに掲載を取り下げます。
        <a href={CONTACT_FORM_URL} target="_blank" rel="noopener noreferrer">
          お問い合わせフォーム
        </a>
        からご連絡ください。曲名などの誤りのご報告も同じフォームで受け付けています。
      </p>

      <h2>禁止事項</h2>
      <ul>
        <li>本サイトの運営を妨げる行為</li>
        <li>本サイトに大量のアクセスを自動で送る行為</li>
        <li>法令や公序良俗に反する行為</li>
      </ul>

      <h2>免責</h2>
      <p>
        本サイトの情報の正確さ・完全さは保証しません。動画は YouTube
        側で削除・非公開・地域制限などにより、予告なく再生できなくなることがあります。
      </p>
      <p>
        本サイトの利用によって生じた損害について、{OPERATOR}
        は責任を負いません。本サイトは、予告なく内容を変更し、または公開を終了することがあります。
      </p>

      <h2>この規約の変更</h2>
      <p>
        この規約は、必要に応じて変更することがあります。変更したときは、このページでお知らせします。
      </p>
    </>
  );
}

function EnTerms() {
  return (
    <>
      <p>
        These terms govern your use of Vocafy (the &ldquo;Site&rdquo;), operated by {OPERATOR}. By
        using the Site, you are deemed to have agreed to these terms.
      </p>

      <h2>About the Site</h2>
      <p>
        The Site is an unofficial personal website that lets you listen to songs made with VOCALOID
        and other synthesized voices through embeds of the videos their creators have published on
        YouTube. It is not affiliated with any of the creators or with the developers of the voice
        products.
      </p>
      <p>
        The Site does not store or distribute any audio or video files. All playback takes place in
        the YouTube player.
      </p>

      <h2>Use of YouTube</h2>
      <p>
        The Site uses YouTube API Services. By using the Site, you are also deemed to have agreed to
        the{' '}
        <a href="https://www.youtube.com/t/terms" target="_blank" rel="noopener noreferrer">
          YouTube Terms of Service
        </a>
        . For how we handle user information, please see our{' '}
        <Link href="/privacy">Privacy Policy</Link>.
      </p>

      <h2>Rights</h2>
      <p>
        Copyright and all other rights in the videos, songs, thumbnails and creator images belong to
        their respective rights holders. Information such as creator names, song titles and voices,
        as well as creator images, is based on publicly available information from{' '}
        <a href="https://vocadb.net/" target="_blank" rel="noopener noreferrer">
          VocaDB
        </a>
        .
      </p>
      <p>
        The Site&rsquo;s icon depicts the character &ldquo;Hatsune Miku&rdquo; of Crypton Future
        Media, INC., drawn under the{' '}
        <a
          href="https://piapro.jp/license/character_guideline"
          target="_blank"
          rel="noopener noreferrer"
        >
          Piapro Character License
        </a>
        .
      </p>
      <p>
        The character illustrations on the voice pages are unofficial fan art created with
        generative AI and are not official artwork. The rights to each character belong to their
        respective rights holders. Characters of Crypton Future Media, INC. are drawn under the{' '}
        <a
          href="https://piapro.jp/license/character_guideline"
          target="_blank"
          rel="noopener noreferrer"
        >
          Piapro Character License
        </a>
        . If a rights holder asks us to take them down, we will promptly remove them.
      </p>

      <h2>Removal requests</h2>
      <p>
        If a rights holder asks us to remove a video featured on the Site, we will review the
        request and promptly remove it. Please contact us through our{' '}
        <a href={CONTACT_FORM_URL} target="_blank" rel="noopener noreferrer">
          contact form
        </a>
        . Reports of errors in song titles and other information are also welcome through the same
        form.
      </p>

      <h2>Prohibited conduct</h2>
      <ul>
        <li>Interfering with the operation of the Site</li>
        <li>Automatically sending large volumes of requests to the Site</li>
        <li>Violating laws or public order and morals</li>
      </ul>

      <h2>Disclaimer</h2>
      <p>
        We do not guarantee the accuracy or completeness of the information on the Site. Videos may
        become unplayable without notice due to removal, being made private, regional restrictions
        or other actions on YouTube.
      </p>
      <p>
        {OPERATOR} is not liable for any damages arising from the use of the Site. The Site may
        change its content or cease operation without notice.
      </p>

      <h2>Changes to these terms</h2>
      <p>
        We may change these terms as necessary. When we do, we will announce the changes on this
        page.
      </p>
    </>
  );
}
