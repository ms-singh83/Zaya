import { CreditCard, FileText, LayoutDashboard, MessageSquare, Receipt, Settings, Users } from 'lucide-react';

/**
 * Sidebar nav per docs/09-UX-UI-SPECIFICATION.md §2.1: "Pipeline, Clients,
 * Deliverables, Invoices, Payments, Messages, Settings." Only Pipeline (the
 * onboarding-checklist home for now) and Settings have a real screen in M1
 * (docs/07-EXECUTION-PLAN.md M1); the rest arrive in M2 through M10 and render as
 * disabled "coming soon" items rather than a dead link or an invented screen.
 */
export interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  enabled: boolean;
}

export const NAV_ITEMS: readonly NavItem[] = [
  { label: 'Pipeline', href: '/dashboard', icon: LayoutDashboard, enabled: true },
  { label: 'Clients', href: '/clients', icon: Users, enabled: false },
  { label: 'Deliverables', href: '/deliverables', icon: FileText, enabled: false },
  { label: 'Invoices', href: '/invoices', icon: Receipt, enabled: false },
  { label: 'Payments', href: '/payments', icon: CreditCard, enabled: false },
  { label: 'Messages', href: '/messages', icon: MessageSquare, enabled: false },
  { label: 'Settings', href: '/settings/business', icon: Settings, enabled: true },
];
