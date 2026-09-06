'use client';

import { LogOut, Settings as SettingsIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Avatar } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuItem, DropdownMenuLinkItem } from '@/components/ui/dropdown-menu';
import { authClient } from '@/lib/auth/client';

/**
 * Sign-out calls the auth seam (lib/auth/client.ts). There is no real session yet
 * pending Supabase credentials, so the call always reports "not configured"; either
 * way there is nothing to keep the user signed into, so the menu still sends them
 * to /login.
 */
export function AccountMenu({ label }: { label: string }) {
  const router = useRouter();

  return (
    <DropdownMenu
      trigger={(triggerProps) => (
        <button type="button" className="flex items-center gap-2 rounded p-1 hover:bg-elevated" {...triggerProps}>
          <Avatar name={label} />
        </button>
      )}
    >
      <div className="px-3 py-2 text-xs text-muted">{label}</div>
      <DropdownMenuLinkItem href="/settings/business">
        <SettingsIcon className="h-4 w-4" aria-hidden />
        Settings
      </DropdownMenuLinkItem>
      <DropdownMenuItem
        className="text-status-overdue"
        onClick={() => {
          void authClient.signOut().finally(() => router.push('/login'));
        }}
      >
        <LogOut className="h-4 w-4" aria-hidden />
        Sign out
      </DropdownMenuItem>
    </DropdownMenu>
  );
}
