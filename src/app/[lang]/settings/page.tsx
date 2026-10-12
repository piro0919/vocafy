import type { Metadata } from 'next';
import { InstallApp } from '@/components/install-app';
import { MixFlowSetting } from '@/components/mix-flow-setting';
import { DockSetting } from '@/components/player/dock-setting';
import { KeyboardHelp } from '@/components/player/keyboard-help';
import { PvSetting } from '@/components/player/pv-setting';
import { ResumeSetting } from '@/components/player/resume-setting';
import { SwipeBackSetting } from '@/components/swipe-back/swipe-back-setting';
import { ThemeSetting } from '@/components/theme/theme-setting';
import { VoiceSetting } from '@/components/theme/voice-setting';
import { Heading } from '@/components/heading';
import { SupportLink } from '@/components/support-link';
import { VisualizerSetting } from '@/components/visualizer/visualizer-setting';
import { langOf } from '@/i18n/config';
import { LangSetting } from '@/i18n/lang-choice';
import { TERMS } from '@/i18n/terms';

export async function generateMetadata({
  params,
}: PageProps<'/[lang]/settings'>): Promise<Metadata> {
  return { title: TERMS[await langOf(params)].settings, robots: { index: false } };
}

export default async function SettingsPage({ params }: PageProps<'/[lang]/settings'>) {
  const t = TERMS[await langOf(params)];
  return (
    <div className="site-color max-w-xl">
      <div className="pt-4 pb-4 sm:pb-6">
        <Heading as="h1" size="page" eyebrow="Settings">
          {t.settings}
        </Heading>
      </div>
      <LangSetting />
      <ThemeSetting />
      <VoiceSetting />
      <MixFlowSetting />
      <PvSetting />
      <ResumeSetting />
      <DockSetting />
      <InstallApp />
      <SwipeBackSetting />
      <KeyboardHelp />
      <VisualizerSetting />
      <SupportLink />
    </div>
  );
}
