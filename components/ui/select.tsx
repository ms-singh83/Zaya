import { forwardRef } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

/**
 * Native <select>, not a Radix combobox: fully keyboard operable and screen-reader
 * friendly with zero added dependency (docs/09-UX-UI-SPECIFICATION.md §1.6 lists
 * "Select"; the M1 forms need a plain single-choice picker, not a searchable
 * combobox, so the native control is the right primitive here).
 */
export const Select = forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...props }, ref) => {
    return (
      <div className="relative">
        <select
          ref={ref}
          className={cn(
            'h-10 w-full appearance-none rounded border border-border bg-surface px-3 pr-9 text-sm text-text',
            'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus',
            'disabled:cursor-not-allowed disabled:opacity-50',
            'aria-[invalid=true]:border-status-overdue',
            className,
          )}
          {...props}
        >
          {children}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden />
      </div>
    );
  },
);
Select.displayName = 'Select';
