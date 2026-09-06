import type { Metadata } from 'next';
import { BrandingForm } from './branding-form';

export const metadata: Metadata = { title: 'Branding, Settings, Zaya' };

export default function BrandingSettingsPage() {
  return <BrandingForm />;
}
