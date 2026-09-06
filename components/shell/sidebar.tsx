'use client';

import { X } from 'lucide-react';
import { SidebarNav } from './sidebar-nav';

/**
 * "Left sidebar (collapsible under 1024px)" (docs/09-UX-UI-SPECIFICATION.md §2.1).
 * Renders as a static column at the `lg` breakpoint and up, and as an off-canvas
 * drawer below it, controlled by AppShell so the Topbar's hamburger button can
 * open it.
 */
export function Sidebar({ mobileOpen, onClose }: { mobileOpen: boolean; onClose: () => void }) {
  return (
    <>
      <aside className="hidden w-60 shrink-0 flex-col border-r border-border bg-surface lg:flex">
        <SidebarBrand />
        <SidebarNav />
      </aside>

      {mobileOpen ? (
        <div className="fixed inset-0 z-30 lg:hidden">
          <button
            type="button"
            aria-label="Close navigation"
            onClick={onClose}
            className="absolute inset-0 bg-black/40"
          />
          <aside role="dialog" aria-modal="true" aria-label="Main navigation" className="absolute inset-y-0 left-0 flex w-60 flex-col bg-surface">
            <div className="flex h-16 items-center justify-between border-b border-border px-4">
              <SidebarBrand />
              <button
                type="button"
                onClick={onClose}
                className="inline-flex h-9 w-9 items-center justify-center rounded text-text hover:bg-elevated"
                aria-label="Close navigation"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <SidebarNav onNavigate={onClose} />
          </aside>
        </div>
      ) : null}
    </>
  );
}

function SidebarBrand() {
  return (
    <div className="flex h-16 items-center gap-2 px-4">
      <span className="text-base font-semibold text-text">Zaya</span>
    </div>
  );
}
