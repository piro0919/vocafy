'use client';

import { useProducerName, useSongTitle } from '@/components/display-names';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { QueueItem } from '@/lib/catalog';
import { toast } from 'sonner';
import { ICON, ICON_SM } from './button-styles';
import { Icon, type IconName } from './icon';
import { QrCode } from './qr-code';
import { useClientValue } from '@/lib/client-value';
import { GLASS_PANEL, MENU_ROW } from '@/components/surface-styles';
import { defineText } from '@/i18n/text';
import { useLocalize, useText } from '@/i18n/navigation';

const TEXT = defineText({
  ja: {
    back: '共有の一覧に戻る',
    qr: 'QRコード',
    qrOf: (text: string) => `${text} の QR コード`,
    copyLink: 'リンクをコピー',
    copied: 'リンクをコピーしました',
    shareSong: 'この曲を共有',
  },
  en: {
    back: 'Back to share options',
    qr: 'QR code',
    qrOf: (text: string) => `QR code for ${text}`,
    copyLink: 'Copy link',
    copied: 'Link copied',
    shareSong: 'Share this song',
  },
});

/** 共有の文に付けるハッシュタグ。ボカロPの名前は付けない（記号入りの名前でタグが切れ、追う人もいない） */
const HASHTAG = 'Vocafy';

/**
 * 共有のボタン（2026-10-11 に本人と決めた）。スマホなど指で操作する端末で共有の窓（Web Share API）が出せるときは、端末の窓を出す
 * （入っているアプリ全部に送れる）。パソコンでは、ボタンの右横に送り先の板を開く（fitMenu）。前はパソコンでは押すとリンクを写すだけだった。
 * 送り先は、ボカロの話題が集まる X と、移る人の増えている Bluesky、LINE、リンクをコピー。どれも投稿の下書きを開く住所で、鍵は要らない
 * 文には #Vocafy を付ける（2026-10-11）。LINE とリンクをコピーは住所だけ
 */
export function ShareMenu({ url, text, label }: { url: string; text: string; label: string }) {
  const t = useText(TEXT);
  const [open, setOpen] = useState(false);
  // 板の中身を送り先から QR に差し替えているか
  const [qr, setQr] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const qrBox = useRef<HTMLDivElement>(null);

  // 板を画面の中に収める。中身を差し替えると高さが変わるので、そのたびに測り直す
  useLayoutEffect(() => {
    const el = menu.current;
    if (!open || !el) return;
    const fit = () => fitMenu(el, qrBox.current);
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, [open, qr]);

  // 板の外を押すか Esc で閉じる
  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (!box.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onPointer);
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const onClick = async () => {
    if ('share' in navigator && matchMedia('(pointer: coarse)').matches) {
      // 窓を閉じただけでも失敗が返るので、何もしない
      await navigator.share({ text: `${text} #${HASHTAG}`, url }).catch(() => {});
      return;
    }
    // 開き直したときは送り先の並びから
    setQr(false);
    setOpen((o) => !o);
  };

  const enc = encodeURIComponent;
  const targets: { name: string; icon: IconName; href: string }[] = [
    {
      name: 'X',
      icon: 'x',
      href: `https://x.com/intent/post?text=${enc(text)}&url=${enc(url)}&hashtags=${HASHTAG}`,
    },
    {
      name: 'Bluesky',
      icon: 'bluesky',
      href: `https://bsky.app/intent/compose?text=${enc(`${text} #${HASHTAG} ${url}`)}`,
    },
    {
      name: 'LINE',
      icon: 'line',
      href: `https://social-plugins.line.me/lineit/share?url=${enc(url)}`,
    },
  ];
  const row = `flex w-full items-center gap-3 ${MENU_ROW}`;

  return (
    <div ref={box} className="relative">
      <button
        type="button"
        onClick={onClick}
        aria-label={label}
        aria-expanded={open}
        title={label}
        className={`grid ${ICON} text-muted hover:text-foreground`}
      >
        <Icon name="share" className="size-5" />
      </button>
      {open && (
        // 形は右上のアカウントのメニューと同じ（すりガラスの角丸の板）
        <div
          ref={menu}
          role="menu"
          className={`${GLASS_PANEL} absolute top-0 left-full z-overlay ml-2 w-52 p-2`}
        >
          {qr ? (
            // QR は板の中身を差し替えて出す。押したボタンのすぐ下に出るので、カメラを向ける先が分かりやすい。
            // 右下の板（次に流れる曲などと同じ外枠）に出す形は、押した所から離れていて向けにくかった
            <>
              <div className="flex items-center pb-1">
                <button
                  type="button"
                  aria-label={t.back}
                  autoFocus
                  onClick={() => setQr(false)}
                  className={`grid ${ICON_SM} text-muted hover:text-foreground`}
                >
                  <Icon name="left" className="size-4" />
                </button>
                <span className="text-sm font-bold">{t.qr}</span>
              </div>
              <div ref={qrBox} className="mx-auto">
                <QrCode value={url} label={t.qrOf(text)} />
              </div>
            </>
          ) : (
            <>
              {targets.map((target) => (
                <a
                  key={target.name}
                  role="menuitem"
                  href={target.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setOpen(false)}
                  className={row}
                >
                  <Icon name={target.icon} className="size-5" />
                  {target.name}
                </a>
              ))}
              <button
                type="button"
                role="menuitem"
                onClick={async () => {
                  setOpen(false);
                  await navigator.clipboard.writeText(url);
                  toast(t.copied);
                }}
                className={row}
              >
                <Icon name="share" className="size-5" />
                {t.copyLink}
              </button>
              {/* パソコンで聴いている曲をスマホで開く・隣の人に読み取ってもらうためのもの。スマホは端末の共有の窓を出すので、ここに来ない */}
              <button type="button" role="menuitem" onClick={() => setQr(true)} className={row}>
                <Icon name="qr" className="size-5" />
                {t.qr}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * 共有の板を画面の中に収める（2026-10-11 に本人と決めた）。板はボタンの右横に、上の端をそろえて開き、
 * 下の再生の帯にかかる分だけ上へずらす。ボタンの下に開いていたころは、縦が 800px ほどの画面で QR が帯の裏に隠れ、
 * 動画の画面の左の列は貼り付いていてスクロールでも出てこなかった。右横なら上へずらしても押したボタンを覆わない。
 * ずらすのは動画の下の端まで（動画に重ねない。YouTube の規約）。それでも入らないときは QR を縮める
 */
export function fitMenu(el: HTMLElement, qrBox: HTMLElement | null) {
  el.style.translate = '';
  if (qrBox) qrBox.style.width = '';
  // 板とボタンの間（ml-2）を、画面の端や動画との間にも使う
  const gap = parseFloat(getComputedStyle(el).marginLeft);
  // 再生の帯の上に間を空けた高さ（globals.css の --above-bar と同じ値。長さとして登録してあり px で読める --toast-bottom で読む）
  const aboveBar = parseFloat(
    getComputedStyle(document.documentElement).getPropertyValue('--toast-bottom'),
  );
  const rect = el.getBoundingClientRect();
  const over = rect.bottom - (window.innerHeight - aboveBar);
  // 画面の右の端からはみ出すときは、左へ寄せる（狭い画面で、動画の下の帯から開いたとき）
  const x = Math.min(0, window.innerWidth - gap - rect.right);
  if (over <= 0) {
    el.style.translate = `${x}px 0`;
    return;
  }
  const stage = document.querySelector('[data-stage-video]')?.getBoundingClientRect();
  const ceiling = (stage && stage.height > 0 ? stage.bottom : 0) + gap;
  const up = Math.max(0, Math.min(over, rect.top - ceiling));
  el.style.translate = `${x}px ${-up}px`;
  const left = over - up;
  if (left > 0 && qrBox) qrBox.style.width = `${qrBox.getBoundingClientRect().width - left}px`;
}

/**
 * 流している曲の共有のボタン。お気に入りの曲・一覧の再生用・ラジオの画面の「再生」の段に置く（2026-10-11 に本人と決めた）。
 * 送るのはボカロPの画面と同じ、曲名を題名と共有の絵に入れた住所（/producers/45/songs/曲の id）。並びそのものは送らない
 * （きょうの出会いは日付で、ラジオは流すにつれて中身が変わり、受け取った側が同じものを聴けない）。song が null なら何も出さない
 */
export function SongShare({ song }: { song: QueueItem | null }) {
  // 住所の元はブラウザの側で決める（作り置きのページにサーバーの住所を焼き込まない）
  const origin = useClientValue(() => window.location.origin, '');
  const to = useLocalize();
  const t = useText(TEXT);
  const songTitle = useSongTitle();
  const producerName = useProducerName();
  if (!song) return null;
  return (
    <ShareMenu
      url={`${origin}${to(`/producers/${song.producerId}/songs/${song.songId}`)}`}
      text={`${songTitle(song).main} - ${producerName(song.producerId, song.producerName)}`}
      label={t.shareSong}
    />
  );
}
