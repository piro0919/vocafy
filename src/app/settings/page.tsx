import type { Metadata } from 'next';
import { InstallApp } from '@/components/install-app';
import { DockSetting } from '@/components/player/dock-setting';
import { KeyboardHelp } from '@/components/player/keyboard-help';
import { SwipeBackSetting } from '@/components/swipe-back/swipe-back-setting';
import { ThemeSetting } from '@/components/theme/theme-setting';
import { VoiceSetting } from '@/components/theme/voice-setting';
import { Heading } from '@/components/heading';
import { SupportLink } from '@/components/support-link';
import { VisualizerSetting } from '@/components/visualizer/visualizer-setting';

export const metadata: Metadata = { title: '設定', robots: { index: false } };

export default function SettingsPage() {
  return (
    <div className="max-w-xl">
      <div className="pt-4 pb-4 sm:pb-6">
        <Heading as="h1" size="page" eyebrow="Settings">
          設定
        </Heading>
      </div>
      <ThemeSetting />
      <VoiceSetting />
      <DockSetting />
      <VisualizerSetting />
      <InstallApp />
      <SwipeBackSetting />
      <KeyboardHelp />
      <SupportLink />
    </div>
  );
}
