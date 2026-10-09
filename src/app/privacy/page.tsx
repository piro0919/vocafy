import type { Metadata } from 'next';
import { Legal } from '@/components/legal';
import { CONTACT_FORM_URL, OPERATOR } from '@/lib/site';

export const metadata: Metadata = { title: 'プライバシーポリシー' };

export default function PrivacyPage() {
  return (
    <Legal title="プライバシーポリシー" updated="2026年10月9日">
      <p>
        Vocafy（以下「本サイト」）は、{OPERATOR}
        が運営しています。本サイトでの利用者の情報の扱いを、次のとおり定めます。
      </p>

      <h2>本サイトが集める情報</h2>
      <p>
        お気に入りの曲とボカロP、音量・ループ・ランダム再生・画面の明るさ・スワイプで戻るの設定は、お使いのブラウザの中（localStorage）に保存します。ログインしていなければ本サイトには送られず、ブラウザのデータを消すと消えます。
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
    </Legal>
  );
}
