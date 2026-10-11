import { createLocalFlag } from '@/lib/local-flag';

/**
 * Vocafy Visualizer（Mac のオマケのアプリ）と連携するか。はじめは連携しない。
 * 連携すると、このブラウザが手元の 127.0.0.1 につなぎに行き、Chrome がローカルネットワークの許可を一度求める。
 * 全員がつなぎに行くとアプリを入れていない人にも許可を求めるので、オンにした人だけにする
 */
const flag = createLocalFlag({ key: 'vocafy-visualizer', value: 'on', stored: true });

export const readVisualizer = flag.read;
export const setVisualizer = flag.write;
export const subscribeVisualizer = flag.subscribe;
