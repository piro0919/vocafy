/**
 * 曲を流しているあいだ、ページの中で無音を流し続けて、音の出口を開けたままにする。
 * 曲の切り替えで無音が続くと、出口がいったん閉じ、開け直すときに Mac のスピーカーがプツッと鳴った。
 * 切り替えの音を録ると信号には跳ねが無く（2026-10-11）、これを入れたら鳴らなくなった
 */
let ctx: AudioContext | null = null;

export function keepAwake() {
  if (typeof window === 'undefined') return;
  if (ctx) {
    if (ctx.state === 'suspended') void ctx.resume();
    return;
  }
  ctx = new AudioContext();
  const source = ctx.createConstantSource();
  source.offset.value = 0;
  source.connect(ctx.destination);
  source.start();
}

export function letSleep() {
  void ctx?.close();
  ctx = null;
}
