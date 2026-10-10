'use client';

import { useRouter } from '@bprogress/next/app';
import { usePathname, useSearchParams } from 'next/navigation';
import { type Ref, useEffect, useRef, useState } from 'react';
import { loadIndex } from '@/lib/search-index';
import { Icon } from './icon';

const BOX =
  'flex h-10 w-full items-center gap-2 rounded-full border border-line/60 bg-glass px-4 focus-within:border-accent/60';

type FieldProps = {
  value: string;
  onChange?: (value: string) => void;
  /** スマホの上の帯の欄。幅いっぱいに広げ、字を 16px にする（それより小さいと iPhone が欄を押したときに拡大する） */
  mobile?: boolean;
  inputRef?: Ref<HTMLInputElement>;
};

function Field({ value, onChange, mobile, inputRef }: FieldProps) {
  return (
    <label className={mobile ? BOX : `${BOX} max-w-md`}>
      <Icon name="search" className="size-5 shrink-0 text-muted" />
      <input
        ref={inputRef}
        type="search"
        enterKeyHint="search"
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        // スマホは打ち終えて決定を押したらキーボードを閉じ、結果を見せる（YouTube のアプリと同じ）
        onKeyDown={(e) => {
          if (mobile && e.key === 'Enter') e.currentTarget.blur();
        }}
        readOnly={!onChange}
        // 押した時点で検索の索引を読み始める。打ち終わって検索の画面へ移るころには読み終わっている
        onFocus={() => void loadIndex().catch(() => {})}
        placeholder="曲名・ボカロP・歌声"
        aria-label="曲名・ボカロP・歌声の名前で探す"
        className={`h-full min-w-0 flex-1 bg-transparent outline-none placeholder:text-muted ${mobile ? 'text-base' : 'text-sm'}`}
      />
    </label>
  );
}

/**
 * 上の帯の検索欄（Spotify・YouTube と同じく上の帯に置く）。打つと検索の画面（?q=）へ移り、結果はそちらに出す。
 * 検索の画面にいるあいだは住所の ?q= に合わせ、ほかの画面へ移ったら空にする。
 * パソコンは上の段にいつも出し、スマホは虫めがねを押したときに上の帯をこの欄に変える（header-bar.tsx）
 */
export function HeaderSearch({
  mobile,
  inputRef,
}: { mobile?: boolean; inputRef?: Ref<HTMLInputElement> } = {}) {
  const params = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const onSearch = pathname === '/search';
  const fromUrl = onSearch ? (params.get('q') ?? '') : '';
  const [text, setText] = useState(fromUrl);
  // 住所が外から変わったとき（戻る・ほかの画面へ移る）は、欄を住所に合わせる
  const [seen, setSeen] = useState(fromUrl);
  if (seen !== fromUrl) {
    setSeen(fromUrl);
    if (fromUrl !== text.trim()) setText(fromUrl);
  }
  const typed = useRef(false);

  // 打った言葉を住所に移す。打つたびに履歴が増えないよう、検索の画面の中では置き換えにする
  useEffect(() => {
    if (!typed.current) return;
    const id = setTimeout(() => {
      typed.current = false;
      const q = text.trim();
      const url = q ? `/search?q=${encodeURIComponent(q)}` : '/search';
      if (onSearch) router.replace(url, { scroll: false, showProgress: false });
      else if (q) router.push(url);
    }, 300);
    return () => clearTimeout(id);
  }, [text, onSearch, router]);

  return (
    <Field
      value={text}
      mobile={mobile}
      inputRef={inputRef}
      onChange={(value) => {
        typed.current = true;
        setText(value);
      }}
    />
  );
}

/** useSearchParams を待つあいだに出す、同じ形の空の欄 */
export function HeaderSearchFallback({ mobile }: { mobile?: boolean } = {}) {
  return <Field value="" mobile={mobile} />;
}
