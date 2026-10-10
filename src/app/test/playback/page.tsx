import type { Metadata } from 'next';
import { Heading } from '@/components/heading';
import { PlaybackTest } from './playback-test';

export const metadata: Metadata = { title: '連続再生のテスト', robots: { index: false } };

/**
 * 連続再生（曲が終わって次へ進む）を確かめるための画面。iPad の Safari は、押す操作の無い再生を止めるので、
 * YouTube とニコニコの曲の並べ方ごとに試す（CLAUDE.md の「分かっている問題」）。どこからもリンクしない
 */
export default function PlaybackTestPage() {
  return (
    <>
      <div className="pt-4 pb-4 sm:pb-6">
        <Heading as="h1" size="page" eyebrow="Test">
          連続再生のテスト
        </Heading>
      </div>
      <PlaybackTest />
    </>
  );
}
