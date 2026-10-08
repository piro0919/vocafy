import type { Metadata } from 'next';
import { VoiceCard } from '@/components/browse-cards';
import { Heading } from '@/components/heading';
import { voices } from '@/lib/catalog';

export const metadata: Metadata = { title: '歌声' };

// 台帳は取り込みのときにしか変わらないので、1時間は作ったページを使い回す
export const revalidate = 3600;

/** 歌声の一覧。曲の多い順に、すべての歌声を並べる（トップには 5 曲以上の上位だけを出している） */
export default async function VoicesPage() {
  const list = await voices();
  return (
    <>
      <div className="pt-4 pb-4 sm:pb-6">
        <Heading as="h1" size="page" eyebrow="Voices">
          歌声
        </Heading>
      </div>
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
        {list.map((v) => (
          <li key={v.id}>
            <VoiceCard {...v} />
          </li>
        ))}
      </ul>
    </>
  );
}
