import { AlertTriangle, CheckCircle2, Info } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

export type BannerTone = 'info' | 'success' | 'error';

interface BannerProps {
  tone: BannerTone;
  children: React.ReactNode;
  className?: string;
}

const toneClass: Record<BannerTone, string> = {
  info: 'border-border bg-elevated text-text',
  success: 'border-status-approved/30 bg-status-approved/10 text-status-approved',
  error: 'border-status-overdue/30 bg-status-overdue/10 text-status-overdue',
};

const toneIcon: Record<BannerTone, React.ComponentType<{ className?: string }>> = {
  info: Info,
  success: CheckCircle2,
  error: AlertTriangle,
};

/**
 * Error state: a plain sentence plus what to do next, never a raw error code
 * (docs/09-UX-UI-SPECIFICATION.md §1.7).
 */
export function Banner({ tone, children, className }: BannerProps) {
  const Icon = toneIcon[tone];
  return (
    <div role={tone === 'error' ? 'alert' : 'status'} className={cn('flex items-start gap-2 rounded border p-3 text-sm', toneClass[tone], className)}>
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <div>{children}</div>
    </div>
  );
}
