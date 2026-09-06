import { SettingsTabs } from '@/components/settings/settings-tabs';

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-text">Settings</h1>
      </div>
      <SettingsTabs />
      {children}
    </div>
  );
}
