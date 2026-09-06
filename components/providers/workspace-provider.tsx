'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type {
  PatchWorkspaceBrandingRequest,
  PatchWorkspaceRequest,
  WorkspaceOnboardingResponse,
  WorkspaceResponse,
} from '@/lib/contracts';
import { createMockWorkspaceClient, type WorkspaceServiceError } from '@/lib/services/workspace-client';

interface WorkspaceContextValue {
  workspace: WorkspaceResponse | null;
  onboarding: WorkspaceOnboardingResponse | null;
  isLoading: boolean;
  loadError: WorkspaceServiceError | null;
  saveBusiness: (input: PatchWorkspaceRequest) => Promise<WorkspaceServiceError | null>;
  saveBranding: (input: PatchWorkspaceBrandingRequest) => Promise<WorkspaceServiceError | null>;
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

/**
 * Holds the one Workspace the signed-in Agency user belongs to (CLAUDE.md §4.5: one
 * Workspace per user in V1). Backed today by the in-memory mock in
 * lib/services/workspace-client.ts, pending Supabase credentials and the real
 * `app/api/v1/workspace*` routes. Every consumer reads and writes through this
 * provider, not through the mock client directly, so the swap to a real API stays a
 * one-file change.
 */
export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const client = useMemo(() => createMockWorkspaceClient(), []);
  const [workspace, setWorkspace] = useState<WorkspaceResponse | null>(null);
  const [onboarding, setOnboarding] = useState<WorkspaceOnboardingResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<WorkspaceServiceError | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const [workspaceResult, onboardingResult] = await Promise.all([client.getWorkspace(), client.getOnboarding()]);
      if (cancelled) return;
      if (!workspaceResult.ok) {
        setLoadError(workspaceResult.error);
        setIsLoading(false);
        return;
      }
      setWorkspace(workspaceResult.data);
      setOnboarding(onboardingResult.ok ? onboardingResult.data : null);
      setIsLoading(false);
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [client]);

  const refreshOnboarding = useCallback(async () => {
    const result = await client.getOnboarding();
    if (result.ok) setOnboarding(result.data);
  }, [client]);

  const saveBusiness = useCallback(
    async (input: PatchWorkspaceRequest) => {
      const result = await client.patchWorkspace(input);
      if (!result.ok) return result.error;
      setWorkspace(result.data);
      await refreshOnboarding();
      return null;
    },
    [client, refreshOnboarding],
  );

  const saveBranding = useCallback(
    async (input: PatchWorkspaceBrandingRequest) => {
      const result = await client.patchBranding(input);
      if (!result.ok) return result.error;
      setWorkspace(result.data);
      return null;
    },
    [client],
  );

  const value = useMemo(
    () => ({ workspace, onboarding, isLoading, loadError, saveBusiness, saveBranding }),
    [workspace, onboarding, isLoading, loadError, saveBusiness, saveBranding],
  );

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace(): WorkspaceContextValue {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error('useWorkspace must be used within a WorkspaceProvider');
  return ctx;
}
