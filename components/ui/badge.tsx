import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils/cn';

/**
 * Status is never colour alone (docs/09-UX-UI-SPECIFICATION.md §1.8): every Badge
 * renders a dot plus its own text, so the word carries the meaning too.
 */
const badgeVariants = cva('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium', {
  variants: {
    tone: {
      neutral: 'bg-elevated text-muted',
      approved: 'bg-status-approved/15 text-status-approved',
      pending: 'bg-status-pending/15 text-status-pending',
      overdue: 'bg-status-overdue/15 text-status-overdue',
      paid: 'bg-status-paid/15 text-status-paid',
    },
  },
  defaultVariants: { tone: 'neutral' },
});

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

// Full class names written out (not built with a template literal) so Tailwind's
// content scanner can see and keep every one of them.
const dotClass: Record<NonNullable<BadgeProps['tone']>, string> = {
  neutral: 'bg-status-neutral',
  approved: 'bg-status-approved',
  pending: 'bg-status-pending',
  overdue: 'bg-status-overdue',
  paid: 'bg-status-paid',
};

export function Badge({ className, tone, children, ...props }: BadgeProps) {
  // cva's VariantProps allows `null` (meaning "unset"), so the default has to be
  // applied here too, not just at the destructuring default.
  const resolvedTone = tone ?? 'neutral';
  return (
    <span className={cn(badgeVariants({ tone: resolvedTone }), className)} {...props}>
      <span className={cn('h-1.5 w-1.5 rounded-full', dotClass[resolvedTone])} aria-hidden />
      {children}
    </span>
  );
}
