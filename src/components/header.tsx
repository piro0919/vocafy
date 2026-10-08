import type { ReactNode } from 'react';

/**
 * 上の帯。スマホだけで出す（パソコンは左のメニューに全部あるので出さない。上の余白は main の md:pt-6 が持つ）。
 * 下のタブ（nav.tsx の MobileTabs）とそろえて、画面の端から左右と上を離した角丸の板として浮かせる。
 * 下へスクロールすると隠れ、上へ戻すと出る（scroll-chrome.tsx と globals.css の .chrome-header）。
 * 彩度は上げない。背景の色は画面に固定してあり板の後ろにも残るので、上げると板だけが下より鮮やかに浮く
 */
export function Header({ children }: { children: ReactNode }) {
  return (
    <header className="chrome-header sticky top-0 z-20 px-3 pt-3 md:hidden">
      <div className="flex h-14 items-center rounded-2xl border border-line/60 bg-sidebar/60 px-2 shadow-lg shadow-black/5 backdrop-blur-lg">
        {children}
      </div>
    </header>
  );
}
