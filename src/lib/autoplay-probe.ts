/**
 * このブラウザが、押す操作の無い音ありの再生を許すかを、無音の短い音声で試す。
 * iPad の Safari は拒み、iPad の Brave は許す（どちらも中身は WebKit で、端末の名乗りも同じなので、名乗りでは見分けられない）。
 * 押した操作の直後に呼ぶと、その操作の続きとして許されてしまうので、ページを開いたときに呼ぶ
 */
export async function probeAutoplay(): Promise<'allowed' | 'blocked' | 'unknown'> {
  const audio = new Audio(silentWav());
  try {
    await audio.play();
    audio.pause();
    return 'allowed';
  } catch (e) {
    return e instanceof DOMException && e.name === 'NotAllowedError' ? 'blocked' : 'unknown';
  } finally {
    URL.revokeObjectURL(audio.src);
  }
}

function silentWav(): string {
  return URL.createObjectURL(new Blob([silentWavBytes()], { type: 'audio/wav' }));
}

function silentWavBase64(): string {
  return btoa(String.fromCharCode(...new Uint8Array(silentWavBytes())));
}

/** 0.1 秒の無音の WAV（8kHz・8bit・モノラル）。音声の入れ物があるので、音ありの再生として扱われる */
function silentWavBytes(): ArrayBuffer {
  const samples = 800;
  const buffer = new ArrayBuffer(44 + samples);
  const view = new DataView(buffer);
  const text = (at: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(at + i, s.charCodeAt(i));
  };
  text(0, 'RIFF');
  view.setUint32(4, 36 + samples, true);
  text(8, 'WAVE');
  text(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, 8000, true);
  view.setUint32(28, 8000, true);
  view.setUint16(32, 1, true);
  view.setUint16(34, 8, true);
  text(36, 'data');
  view.setUint32(40, samples, true);
  // 8bit の無音は 128
  for (let i = 0; i < samples; i++) view.setUint8(44 + i, 128);
  return buffer;
}

/**
 * 他所のサイトの埋め込みの中で、同じ試しをする。WebKit は、ページの本体と他所のサイトの埋め込み（ニコニコ・YouTube）とで
 * 再生を許す条件を分けているようで、本体で試すと許されるのに埋め込みでは拒まれた（2026-10-10 に Playwright の WebKit で確かめた）。
 * sandbox で allow-same-origin を付けない iframe は、ブラウザから別のサイトとして扱われる
 */
export function probeAutoplayInFrame(): Promise<'allowed' | 'blocked' | 'unknown'> {
  return new Promise((resolve) => {
    const iframe = document.createElement('iframe');
    iframe.sandbox.add('allow-scripts');
    iframe.allow = 'autoplay';
    iframe.hidden = true;
    const wav = silentWavBase64();
    iframe.srcdoc = `<script>
      const a = new Audio('data:audio/wav;base64,${wav}');
      a.play().then(() => { a.pause(); parent.postMessage({ probe: 'allowed' }, '*'); })
        .catch((e) => parent.postMessage({ probe: e && e.name === 'NotAllowedError' ? 'blocked' : 'unknown' }, '*'));
    </script>`;
    const done = (result: 'allowed' | 'blocked' | 'unknown') => {
      window.removeEventListener('message', onMessage);
      clearTimeout(timer);
      iframe.remove();
      resolve(result);
    };
    const onMessage = (e: MessageEvent<{ probe?: 'allowed' | 'blocked' | 'unknown' }>) => {
      if (e.source === iframe.contentWindow && e.data?.probe) done(e.data.probe);
    };
    window.addEventListener('message', onMessage);
    const timer = setTimeout(() => done('unknown'), 5000);
    document.body.append(iframe);
  });
}
