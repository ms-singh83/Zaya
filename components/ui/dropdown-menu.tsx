'use client';

import Link, { type LinkProps } from 'next/link';
import { useEffect, useId, useRef, useState } from 'react';
import { cn } from '@/lib/utils/cn';

const itemClass =
  'flex w-full items-center gap-2 rounded px-3 py-2 text-left text-sm text-text hover:bg-elevated focus-visible:outline focus-visible:outline-2 focus-visible:outline-focus';

interface DropdownMenuProps {
  trigger: (props: { onClick: () => void; 'aria-expanded': boolean; 'aria-haspopup': 'menu'; id: string }) => React.ReactNode;
  children: React.ReactNode;
  align?: 'left' | 'right';
}

/**
 * Minimal accessible menu: no Radix dependency (none is installed and the M1
 * assignment needs sign-off to add one), but still keyboard operable per
 * agents/FRONTEND.md definition of done. Escape and an outside click close it,
 * focus returns to the trigger, and the trigger carries the right aria attributes.
 */
export function DropdownMenu({ trigger, children, align = 'right' }: DropdownMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const restoreFocusTo = useRef<HTMLElement | null>(null);
  const triggerId = useId();

  function close() {
    setOpen(false);
    restoreFocusTo.current?.focus();
  }

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') close();
    }
    function onClickOutside(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('mousedown', onClickOutside);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('mousedown', onClickOutside);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      {trigger({
        onClick: () => {
          restoreFocusTo.current = document.activeElement as HTMLElement | null;
          setOpen((v) => !v);
        },
        'aria-expanded': open,
        'aria-haspopup': 'menu',
        id: triggerId,
      })}
      {open ? (
        <div
          role="menu"
          aria-labelledby={triggerId}
          // Bubble-phase: an item's own onClick (select/navigate) runs first, this
          // closes the menu after, so selecting an item does not leave it open.
          onClick={close}
          className={cn(
            'absolute z-20 mt-2 min-w-[12rem] rounded border border-border bg-surface p-1 shadow-card',
            align === 'right' ? 'right-0' : 'left-0',
          )}
        >
          {children}
        </div>
      ) : null}
    </div>
  );
}

export function DropdownMenuItem({ className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button role="menuitem" type="button" className={cn(itemClass, className)} {...props} />;
}

/** A menu item that navigates, kept as an <a> rather than nested inside a <button>. */
export function DropdownMenuLinkItem({ className, ...props }: LinkProps & { className?: string; children: React.ReactNode }) {
  return <Link role="menuitem" className={cn(itemClass, className)} {...props} />;
}
