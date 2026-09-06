import { cn } from '@/lib/utils/cn';

/**
 * Loading state primitive. Never a spinner on a full page
 * (docs/09-UX-UI-SPECIFICATION.md §1.7, agents/FRONTEND.md "Never").
 */
export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('animate-pulse rounded bg-elevated', className)} {...props} />;
}
