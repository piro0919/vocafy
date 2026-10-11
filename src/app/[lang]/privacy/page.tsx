import type { Metadata } from 'next';
import { Legal } from '@/components/legal';
import { langOf } from '@/i18n/config';
import { TERMS } from '@/i18n/terms';
import { CONTACT_FORM_URL, OPERATOR } from '@/lib/site';

/** 最終更新日。英訳は日本語の版と同じ日付にそろえる */
const UPDATED = { ja: '2026年10月12日', en: 'October 12, 2026' };

export async function generateMetadata({
  params,
}: PageProps<'/[lang]/privacy'>): Promise<Metadata> {
  return { title: TERMS[await langOf(params)].privacy };
}

/**
 * 本文は言語ごとに分けて書く。日本語の版が正本で、英訳と食い違うときは日本語の版が優先する
 * （英訳の頭の断り書きは legal.tsx）
 */
export default async function PrivacyPage({ params }: PageProps<'/[lang]/privacy'>) {
  const lang = await langOf(params);
  return (
    <Legal lang={lang} title={TERMS[lang].privacy} eyebrow="Privacy" updated={UPDATED[lang]}>
      {lang === 'en' ? <EnPrivacy /> : <JaPrivacy />}
    </Legal>
  );
}

function JaPrivacy() {
  return (
    <>
      <p>
        Vocafy（以下「本サイト」）は、{OPERATOR}
        が運営しています。本サイトでの利用者の情報の扱いを、次のとおり定めます。
      </p>

      <h2>本サイトが集める情報</h2>
      <p>
        お気に入りの曲とボカロP、最近聴いた曲（直近の100曲）、最近の検索の言葉（直近の8件）、音量・ループ・ランダム再生・画面の明るさ・サイトカラー（流している曲の歌声の色にするかどうか、開くたびに変える色を含む）・スワイプで戻る・表示する言語の設定は、お使いのブラウザの中（localStorage）に保存します。ログインしていなければ本サイトには送られず、ブラウザのデータを消すと消えます。最近聴いた曲は、ログインしていても本サイトには送りません。履歴の画面の「履歴を削除」から消せます。
      </p>

      <h2>ログインしたときに預かる情報</h2>
      <p>
        ログインは任意で、Google アカウントで行います。ログインすると、Google
        から受け取るお名前・メールアドレス・プロフィール画像と、お気に入りの曲とボカロPを、本サイトのデータベースに保存します。これらは、ほかの端末でも同じお気に入りを使えるようにするためと、ログインの状態を保つためにだけ使い、法令に基づく場合を除いて第三者に渡しません。
      </p>
      <p>
        ログインの状態を保つため、ログインした方のブラウザに Cookie
        を保存します。アカウントと預かった情報を消したいときは、
        <a href={CONTACT_FORM_URL} target="_blank" rel="noopener noreferrer">
          お問い合わせフォーム
        </a>
        からご連絡ください。
      </p>
      <p>
        どのページがどれくらい見られているかを知るため、Vercel Web Analytics
        を使っています。閲覧したページ、参照元、国、端末やブラウザの種類を、個人を特定しない形で集計します。Cookie
        は使いません。詳しくは{' '}
        <a
          href="https://vercel.com/docs/analytics/privacy-policy"
          target="_blank"
          rel="noopener noreferrer"
        >
          Vercel のプライバシーについての説明
        </a>
        をご覧ください。
      </p>

      <h2>YouTube の動画について</h2>
      <p>
        本サイトは YouTube API Services を使い、YouTube
        の動画を埋め込んで再生しています。動画を表示・再生すると、YouTube と Google が、Cookie
        などを使って利用者の情報を集めることがあります。その扱いは、次の規約とポリシーに従います。
      </p>
      <ul>
        <li>
          <a href="https://www.youtube.com/t/terms" target="_blank" rel="noopener noreferrer">
            YouTube 利用規約
          </a>
        </li>
        <li>
          <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer">
            Google プライバシーポリシー
          </a>
        </li>
      </ul>
      <p>
        本サイトは、YouTube API Services を通じて利用者個人の情報を取得・保存しません。YouTube
        から取得しているのは、動画のサムネイルと ID など、公開されている情報だけです。
      </p>
      <p>
        Google による情報の利用を止めたいときは、
        <a
          href="https://security.google.com/settings/security/permissions"
          target="_blank"
          rel="noopener noreferrer"
        >
          Google アカウントの設定
        </a>
        や、ブラウザの Cookie の設定から変更できます。
      </p>

      <h2>お問い合わせで受け取る情報</h2>
      <p>
        <a href={CONTACT_FORM_URL} target="_blank" rel="noopener noreferrer">
          お問い合わせフォーム
        </a>
        （Google
        フォーム）からお送りいただいたお名前・メールアドレス・内容は、お問い合わせへの対応にだけ使い、法令に基づく場合を除いて第三者に渡しません。
      </p>

      <h2>このポリシーの変更</h2>
      <p>
        このポリシーは、必要に応じて変更することがあります。変更したときは、このページでお知らせします。
      </p>
    </>
  );
}

function EnPrivacy() {
  return (
    <>
      <p>
        Vocafy (the &ldquo;Site&rdquo;) is operated by {OPERATOR}. This policy describes how the
        Site handles user information.
      </p>

      <h2>Information the Site collects</h2>
      <p>
        Your favorite songs and producers, recently played songs (the last 100), recent search terms
        (the last 8), and your settings for volume, repeat, shuffle, screen brightness, site color
        (including whether to use the color of the voice singing the current song, and the colors to
        switch among on each visit), swipe to go back and display language are stored in your
        browser (localStorage). Unless you are signed in, they are not sent to the Site, and they
        are deleted when you clear your browser data. Recently played songs are not sent to the Site
        even when you are signed in. You can delete them with &ldquo;Clear history&rdquo; on the
        History page.
      </p>

      <h2>Information we hold when you sign in</h2>
      <p>
        Signing in is optional and is done with a Google account. When you sign in, we store in the
        Site&rsquo;s database your name, email address and profile picture received from Google,
        along with your favorite songs and producers. We use this information only to let you use
        the same favorites on other devices and to keep you signed in, and we do not provide it to
        third parties except as required by law.
      </p>
      <p>
        To keep you signed in, we store a cookie in the browser of users who sign in. If you would
        like your account and the information we hold to be deleted, please contact us through our{' '}
        <a href={CONTACT_FORM_URL} target="_blank" rel="noopener noreferrer">
          contact form
        </a>
        .
      </p>
      <p>
        We use Vercel Web Analytics to understand which pages are viewed and how often. It
        aggregates the pages viewed, referrers, countries, and device and browser types in a way
        that does not identify individuals. It does not use cookies. For details, see{' '}
        <a
          href="https://vercel.com/docs/analytics/privacy-policy"
          target="_blank"
          rel="noopener noreferrer"
        >
          Vercel&rsquo;s privacy information
        </a>
        .
      </p>

      <h2>YouTube videos</h2>
      <p>
        The Site uses YouTube API Services to embed and play YouTube videos. When you view or play a
        video, YouTube and Google may collect information about you using cookies and other means.
        Such information is handled in accordance with the following terms and policy.
      </p>
      <ul>
        <li>
          <a href="https://www.youtube.com/t/terms" target="_blank" rel="noopener noreferrer">
            YouTube Terms of Service
          </a>
        </li>
        <li>
          <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer">
            Google Privacy Policy
          </a>
        </li>
      </ul>
      <p>
        The Site does not obtain or store personal information about users through YouTube API
        Services. The only information the Site obtains from YouTube is publicly available
        information, such as video thumbnails and IDs.
      </p>
      <p>
        If you want to stop Google from using your information, you can change this in your{' '}
        <a
          href="https://security.google.com/settings/security/permissions"
          target="_blank"
          rel="noopener noreferrer"
        >
          Google Account settings
        </a>{' '}
        or in your browser&rsquo;s cookie settings.
      </p>

      <h2>Information received through inquiries</h2>
      <p>
        The name, email address and message you send through our{' '}
        <a href={CONTACT_FORM_URL} target="_blank" rel="noopener noreferrer">
          contact form
        </a>{' '}
        (a Google Form) are used only to respond to your inquiry, and we do not provide them to
        third parties except as required by law.
      </p>

      <h2>Changes to this policy</h2>
      <p>
        We may change this policy as necessary. When we do, we will announce the changes on this
        page.
      </p>
    </>
  );
}
