'use client';

import { useMemo } from 'react';
import { encode } from 'uqr';

/**
 * 住所の QR コード（2026-10-11）。ブラウザの中で作るので、関数も DB も動かない。
 * 暗い画面でも白地に黒で出す（色を反転した QR は読めない読み取りアプリがある）。地の白は外側の余白（クワイエットゾーン）を兼ねる
 */
export function QrCode({ value, label }: { value: string; label: string }) {
  const { size, path } = useMemo(() => {
    const qr = encode(value, { ecc: 'M', boostEcc: true, border: 2 });
    // 黒いマスを1つの path にまとめる。マスごとに rect を並べると数千の要素になる
    let d = '';
    qr.data.forEach((row, y) =>
      row.forEach((on, x) => {
        if (on) d += `M${x} ${y}h1v1h-1z`;
      }),
    );
    return { size: qr.size, path: d };
  }, [value]);

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label={label}
      shapeRendering="crispEdges"
      className="block aspect-square w-full rounded-lg bg-white"
    >
      <path d={path} className="fill-black" />
    </svg>
  );
}
