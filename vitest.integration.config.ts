import { defineConfig } from 'vitest/config';
import path from 'node:path';

// Separate from vitest.config.ts on purpose: the default config (`npm test` / `npm run
// test:coverage`) only picks up `lib/**` and `app/**`, so the unit suite and its coverage gate
// never depend on a database being reachable. This config is for
// `supabase/tests/**` only — docs/16-TESTING-STRATEGY.md §3 "integration tests (Vitest against a
// local Supabase)" — and needs NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY /
// SUPABASE_SERVICE_ROLE_KEY set. Individual suites skip themselves (not fail) when those are
// absent — see supabase/tests/rls/helpers.ts `integrationEnvReady`.
export default defineConfig({
  resolve: {
    alias: { '@': path.resolve(__dirname, '.') },
  },
  test: {
    environment: 'node',
    include: ['supabase/tests/**/*.test.ts'],
  },
});
