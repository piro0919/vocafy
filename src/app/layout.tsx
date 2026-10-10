import { Analytics } from '@vercel/analytics/next';
import type { Metadata, Viewport } from 'next';
import { M_PLUS_Rounded_1c, Orbitron, Zen_Kaku_Gothic_New } from 'next/font/google';
import { Suspense } from 'react';
import { AmbientProvider } from '@/components/ambient';
import { Header } from '@/components/header';
import { HeaderBar } from '@/components/header-bar';
import { HeaderSearch, HeaderSearchFallback } from '@/components/header-search';
import { MobileTabs, Sidebar } from '@/components/nav';
import { AccountButton } from '@/components/account/account-button';
import { MixButton } from '@/components/mix-button';
import { AccountSync } from '@/components/account/account-sync';
import { HistoryRecorder } from '@/components/player/history-recorder';
import { SongTitle } from '@/components/player/song-title';
import { PageRestore } from '@/components/page-restore';
import { VoiceFollower } from '@/components/theme/voice-follower';
import { PlayerProvider } from '@/components/player/player-provider';
import { VisualizerLink } from '@/components/visualizer/visualizer-link';
import { Toaster } from '@/components/toaster';
import { ScrollChrome } from '@/components/scroll-chrome';
import { SiteFooter } from '@/components/site-footer';
import { SwipeBack } from '@/components/swipe-back/swipe-back';
import { Progress } from '@/components/progress';
import { themeScript } from '@/components/theme/theme-script';
import { ThemeWatcher } from '@/components/theme/theme-watcher';
import { SITE_URL } from '@/lib/site';
import './globals.css';
import { COLORS } from '@/lib/colors';

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
  description:
    'ボカロ曲を、ずっと聴ける音楽プレイヤー。ボカロP・歌声・年代から選んで、本家の動画で流す。',
  twitter: { card: 'summary_large_image' },
};

// スマホのブラウザの枠の色。端末の設定に合わせて、地の色とそろえる
export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: COLORS.darkBg },
    { media: '(prefers-color-scheme: light)', color: COLORS.lightBg },
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
                <div className="flex min-w-0 flex-1 flex-col md:pl-sidebar">
                  <Header>
                    <HeaderBar />
                  </Header>
                  {/*
                    パソコンの上の段。検索欄とログインを置く（Spotify・YouTube と同じ置き場所）。ログインの左に、きょうの出会いを流すサイコロ。
                    左のメニューと同じく、画面の端から離した角丸の板として画面の上に留める
                  */}
                  <div className="sticky top-0 z-header hidden px-gutter pt-gutter md:block">
                    <div className="flex h-header items-center justify-between gap-4 rounded-2xl border border-line/60 bg-glass px-3 shadow-float backdrop-blur-lg backdrop-saturate-150">
                      <Suspense fallback={<HeaderSearchFallback />}>
                        <HeaderSearch />
                      </Suspense>
                      <div className="flex items-center gap-2">
                        <MixButton />
                        <AccountButton />
                      </div>
                    </div>
                  </div>
                  <main className="page-x flex-1 md:pt-content-top">{children}</main>
                  <SiteFooter />
                </div>
              </AmbientProvider>
            </div>
            <MobileTabs />
            <HistoryRecorder />
            <SongTitle />
            {/* 住所の ?以降を読むので、Suspense で包む（作り置きのページを壊さないため） */}
            <Suspense fallback={null}>
              <PageRestore />
            </Suspense>
            <VoiceFollower />
            <VisualizerLink />
          </PlayerProvider>
        </Progress>
        <Toaster />
        <ThemeWatcher />
        <AccountSync />
        <ScrollChrome />
        <SwipeBack />
        <Analytics />
      </body>
    </html>
  );
}
