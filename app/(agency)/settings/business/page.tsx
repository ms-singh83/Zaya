import type { Metadata } from 'next';
import { BusinessForm } from './business-form';

export const metadata: Metadata = { title: 'Business and GST, Settings, Zaya' };

export default function BusinessSettingsPage() {
  return <BusinessForm />;
}
