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
import { FavoritesPlayButton } from '@/components/favorites-play';
import { AccountSync } from '@/components/account/account-sync';
import { HistoryRecorder } from '@/components/player/history-recorder';
import { SongTitle } from '@/components/player/song-title';
import { NavigationDepth } from '@/components/navigation-depth';
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
import { DEFAULT_LANG, isLang } from '@/i18n/config';
import { LangRedirect } from '@/i18n/lang-choice';
import { VoiceNamesProvider } from '@/components/voice-names';
import { voiceNamesFor } from '@/lib/voice-names';
import { producerNamesFor } from '@/lib/producer-names';
import { ProducerNamesProvider } from '@/components/display-names';
import { defineText } from '@/i18n/text';
import { notFound } from 'next/navigation';
import '../globals.css';
import { COLORS } from '@/lib/colors';
import { GLASS_PANEL } from '@/components/surface-styles';

// ロゴの字。合成音声の機械らしさを出す、角ばった字。使うのは「Vocafy」の6文字だけ
const orbitron = Orbitron({
  variable: '--font-orbitron',
  subsets: ['latin'],
  weight: '900',
});

// 本文・ボタン・説明の字。読みやすさを優先したゴシック体。
// 先読みはしない。先読みにすると、太字（700）だけ日本語の分割ファイル119個（1.4MB）がすべて latin として先読みに入り、
// どのページも初めて開くたびに使わない字まで読み込ませていた（2026-10-12 に分かった。400 は latin の1個だけ）。
// 先読みしなくても、字は CSS の unicode-range で、画面に出る字の分だけ読み込まれる
const zenKaku = Zen_Kaku_Gothic_New({
  variable: '--font-body',
  subsets: ['latin'],
  weight: ['400', '700'],
  preload: false,
});

// 見出し・ボカロP名の字。デフォルメのミクのアイコンに合う、丸みのある明るい字。大きな字にだけ使う。
// 日本語の字は Google Fonts が使う字の分だけを分けて配るので、先読みはしない（subsets の指定が無い書体）
const rounded = M_PLUS_Rounded_1c({
  variable: '--font-rounded',
  weight: '800',
  preload: false,
});

const TEXT = defineText({
  ja: {
    description:
      'ボカロ曲を、ずっと聴ける音楽プレイヤー。ボカロP・歌声・年代から選んで、本家の動画で流す。',
  },
  en: {
    description:
      'A music player for endless Vocaloid songs. Pick by producer, voice or year, and play the original videos.',
  },
});

/** 日本語の住所はそのまま、英語は /en の下。日本語のページも中では /ja の下で作るので、日本語だけを先に作る */
export function generateStaticParams() {
  return [{ lang: DEFAULT_LANG }];
}

export async function generateMetadata({ params }: LayoutProps<'/[lang]'>): Promise<Metadata> {
  const { lang } = await params;
  if (!isLang(lang)) return {};
  return {
    metadataBase: new URL(SITE_URL),
    title: { default: 'Vocafy', template: '%s | Vocafy' },
    description: TEXT[lang].description,
    twitter: { card: 'summary_large_image' },
    // ホーム画面のアプリで、ステータスバーを不透明にして本文をその下から始める。iPad のアプリで上部がにじんで見えたので、koidamashii と同じ値にした（2026-10-12。効いたかは未確認）
    appleWebApp: { capable: true, title: 'Vocafy', statusBarStyle: 'default' },
  };
}

// スマホのブラウザの枠の色。端末の設定に合わせて、地の色とそろえる
export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: COLORS.darkBg },
    { media: '(prefers-color-scheme: light)', color: COLORS.lightBg },
  ],
};

export default async function RootLayout({ children, params }: LayoutProps<'/[lang]'>) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  const [voiceNames, producerNames] = await Promise.all([
    voiceNamesFor(lang),
    producerNamesFor(lang),
  ]);
  return (
    // data-theme はページを描く前に themeScript が付けるので、サーバーの出力と食い違ってよい
    <html
      lang={lang}
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
        <VoiceNamesProvider names={voiceNames}>
          <ProducerNamesProvider names={producerNames}>
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
                    パソコンの上の段。検索欄とログインを置く（Spotify・YouTube と同じ置き場所）。ログインの左に、きょうの出会いを流すサイコロとお気に入りを流すボタン。
                    左のメニューと同じく、画面の端から離した角丸の板として画面の上に留める
                  */}
                      <div
                        data-top-bar
                        className="site-color sticky top-0 z-header hidden px-gutter pt-gutter md:block"
                      >
                        <div
                          className={`${GLASS_PANEL} flex h-header items-center justify-between gap-4 header-x`}
                        >
                          <Suspense fallback={<HeaderSearchFallback />}>
                            <HeaderSearch />
                          </Suspense>
                          <div className="flex shrink-0 items-center gap-2">
                            <MixButton />
                            <FavoritesPlayButton />
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
                <NavigationDepth />
                {/* 住所の ?以降を読むので、Suspense で包む（作り置きのページを壊さないため） */}
                <Suspense fallback={null}>
                  <PageRestore />
                </Suspense>
                <VoiceFollower />
                <VisualizerLink />
                <LangRedirect />
              </PlayerProvider>
            </Progress>
          </ProducerNamesProvider>
        </VoiceNamesProvider>
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
