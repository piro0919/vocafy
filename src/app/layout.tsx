import { Analytics } from '@vercel/analytics/next';
import type { Metadata, Viewport } from 'next';
import { M_PLUS_Rounded_1c, Orbitron, Zen_Kaku_Gothic_New } from 'next/font/google';
import Link from 'next/link';
import { AmbientProvider } from '@/components/ambient';
import { Header } from '@/components/header';
import { HeaderBar } from '@/components/header-bar';
import { MobileTabs, Sidebar } from '@/components/nav';
import { PlayerProvider } from '@/components/player/player-provider';
import { ScrollChrome } from '@/components/scroll-chrome';
import { SwipeBack } from '@/components/swipe-back/swipe-back';
import { Progress } from '@/components/progress';
import { themeScript } from '@/components/theme/theme-script';
import { ThemeWatcher } from '@/components/theme/theme-watcher';
import { CONTACT_FORM_URL, OPERATOR, SITE_URL } from '@/lib/site';
import './globals.css';

// ロゴの字。合成音声の機械らしさを出す、角ばった字。使うのは「Vocafy」の6文字だけ
const orbitron = Orbitron({
  variable: '--font-orbitron',
  subsets: ['latin'],
  weight: '900',
});

// 本文・ボタン・説明の字。読みやすさを優先したゴシック体
const zenKaku = Zen_Kaku_Gothic_New({
  variable: '--font-body',
  subsets: ['latin'],
  weight: ['400', '700'],
});

// 見出し・ボカロP名の字。デフォルメのミクのアイコンに合う、丸みのある明るい字。大きな字にだけ使う。
// 日本語の字は Google Fonts が使う字の分だけを分けて配るので、先読みはしない（subsets の指定が無い書体）
const rounded = M_PLUS_Rounded_1c({
  variable: '--font-rounded',
  weight: '800',
  preload: false,
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: 'Vocafy', template: '%s | Vocafy' },
  description: 'ボカロ曲を、ボカロPごとに聴ける。合成音声の曲を、YouTube の本家の動画で流す。',
  twitter: { card: 'summary_large_image' },
};

// スマホのブラウザの枠の色。端末の設定に合わせて、地の色とそろえる
export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#0b0f12' },
    { media: '(prefers-color-scheme: light)', color: '#f5f9f9' },
  ],
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    // data-theme はページを描く前に themeScript が付けるので、サーバーの出力と食い違ってよい
    <html
      lang="ja"
      className={`${zenKaku.variable} ${rounded.variable} ${orbitron.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        {/*
          ページを描く前に data-theme を付ける。next/script の beforeInteractive は Next.js の仕組みが
          動き出してから実行されるので、開いた瞬間に色がちらつく。そのため素の script を置く。
          開発中にレイアウトを描き直すと React が script タグについて警告を出すが、本番には関係しない
        */}
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-full font-sans">
        <Progress>
          <PlayerProvider>
            {/*
              画面の上部の色の背景（ambient.tsx）が、ヘッダーの下とサイドバーの後ろまで回り込むよう、
              画面全体のこの枠を基準にする
            */}
            <div className="relative isolate flex min-h-dvh">
              <AmbientProvider>
                <Sidebar />
                <div className="flex min-w-0 flex-1 flex-col md:pl-63">
                  <Header>
                    <HeaderBar />
                  </Header>
                  <main className="flex-1 px-4 pb-12 sm:px-8">{children}</main>
                  {/* 375px の幅でも、リンク3つと © が1行に収まるよう、スマホでは字を小さく、間を詰める */}
                  <footer className="page-bottom flex items-center gap-x-3 px-4 pt-6 text-[11px] whitespace-nowrap text-muted sm:gap-x-6 sm:px-8 sm:text-sm">
                    <Link href="/terms" className="hover:text-foreground">
                      利用規約
                    </Link>
                    <Link href="/privacy" className="hover:text-foreground">
                      プライバシーポリシー
                    </Link>
                    <a
                      href={CONTACT_FORM_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-foreground"
                    >
                      お問い合わせ
                    </a>
                    <span className="ml-auto">© {OPERATOR}</span>
                  </footer>
                </div>
              </AmbientProvider>
            </div>
            <MobileTabs />
          </PlayerProvider>
        </Progress>
        <ThemeWatcher />
        <ScrollChrome />
        <SwipeBack />
        <Analytics />
      </body>
    </html>
  );
}
