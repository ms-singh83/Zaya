'use client';

import Link from 'next/link';
import { useState } from 'react';
import { GoogleButton } from '@/components/auth/google-button';
import { signUpSchema } from '@/components/auth/auth-schemas';
import { Banner } from '@/components/ui/banner';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { authClient } from '@/lib/auth/client';
import { fieldErrors } from '@/lib/utils/zod-errors';

/**
 * docs/08-USER-FLOWS.md F1 step 1: "Sign up. Supabase Auth, email or Google. On
 * first login the Workspace row is created and the user becomes its owner."
 * Both paths call the pending-creds auth seam (lib/auth/client.ts): there is no
 * live Supabase project yet, so submitting shows the honest "not connected" error
 * through the same error-state pattern a real failure would use later.
 */
export function SignUpForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Partial<Record<'email' | 'password', string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    const parsed = signUpSchema.safeParse({ email, password });
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      return;
    }
    setErrors({});
    setIsSubmitting(true);
    const result = await authClient.signUpWithEmail(parsed.data);
    setIsSubmitting(false);
    if (!result.ok) setFormError(result.error.message);
  }

  async function handleGoogle() {
    setFormError(null);
    const result = await authClient.signInWithGoogle();
    if (!result.ok) setFormError(result.error.message);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="text-center">
        <h1 className="text-xl font-semibold text-text">Create your workspace</h1>
        <p className="mt-1 text-sm text-muted">Set up Zaya for your agency.</p>
      </div>

      {formError ? <Banner tone="error">{formError}</Banner> : null}

      <GoogleButton onClick={handleGoogle} />

      <div className="flex items-center gap-3 text-xs text-muted">
        <span className="h-px flex-1 bg-border" />
        or
        <span className="h-px flex-1 bg-border" />
      </div>

      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        <Field label="Work email" htmlFor="signup-email" error={errors.email} required>
          {(a) => <Input {...a} type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />}
        </Field>
        <Field label="Password" htmlFor="signup-password" error={errors.password} hint="At least 8 characters." required>
          {(a) => (
            <Input {...a} type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
          )}
        </Field>
        <Button type="submit" isLoading={isSubmitting} className="w-full">
          Create workspace
        </Button>
      </form>

      <p className="text-center text-sm text-muted">
        Already have a workspace?{' '}
        <Link href="/login" className="font-medium text-primary hover:text-primary-hover">
          Sign in
        </Link>
      </p>
    </div>
  );
}
