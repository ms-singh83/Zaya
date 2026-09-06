import { cn } from '@/lib/utils/cn';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
}

/**
 * One line of what this is plus one primary action (docs/09-UX-UI-SPECIFICATION.md
 * §1.7). Used for a screen with nothing in it yet, not for a load failure.
 */
export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center gap-3 rounded-card border border-dashed border-border p-12 text-center', className)}>
      {icon}
      <p className="text-base font-medium text-text">{title}</p>
      <p className="max-w-sm text-sm text-muted">{description}</p>
      {action}
    </div>
  );
}
