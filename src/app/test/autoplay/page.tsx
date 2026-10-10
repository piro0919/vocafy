import type { Metadata } from 'next';
import { Heading } from '@/components/heading';
import { AutoplayTest } from './autoplay-test';

export const metadata: Metadata = { title: '自動再生のテスト', robots: { index: false } };

/**
 * 押す操作の無い音ありの再生を、このブラウザが許すかを確かめる画面。無音の音声（lib/autoplay-probe.ts）と
 * ニコニコの埋め込みの答えがそろうかを見る。どこからもリンクしない
 */
export default function AutoplayTestPage() {
  return (
    <>
      <div className="pt-4 pb-4 sm:pb-6">
        <Heading as="h1" size="page" eyebrow="Test">
          自動再生のテスト
        </Heading>
      </div>
      <AutoplayTest />
    </>
  );
}
