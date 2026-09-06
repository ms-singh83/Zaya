'use client';

import Link from 'next/link';
import { useState } from 'react';
import { signInSchema } from '@/components/auth/auth-schemas';
import { GoogleButton } from '@/components/auth/google-button';
import { Banner } from '@/components/ui/banner';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { authClient } from '@/lib/auth/client';
import { fieldErrors } from '@/lib/utils/zod-errors';

/**
 * Sign-in seam, same pending-creds posture as SignUpForm (lib/auth/client.ts).
 */
export function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Partial<Record<'email' | 'password', string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    const parsed = signInSchema.safeParse({ email, password });
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      return;
    }
    setErrors({});
    setIsSubmitting(true);
    const result = await authClient.signInWithEmail(parsed.data);
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
        <h1 className="text-xl font-semibold text-text">Sign in</h1>
        <p className="mt-1 text-sm text-muted">Welcome back to Zaya.</p>
      </div>

      {formError ? <Banner tone="error">{formError}</Banner> : null}

      <GoogleButton onClick={handleGoogle} />

      <div className="flex items-center gap-3 text-xs text-muted">
        <span className="h-px flex-1 bg-border" />
        or
        <span className="h-px flex-1 bg-border" />
      </div>

      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        <Field label="Email" htmlFor="login-email" error={errors.email} required>
          {(a) => <Input {...a} type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />}
        </Field>
        <Field label="Password" htmlFor="login-password" error={errors.password} required>
          {(a) => (
            <Input {...a} type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
          )}
        </Field>
        <Button type="submit" isLoading={isSubmitting} className="w-full">
          Sign in
        </Button>
      </form>

      <p className="text-center text-sm text-muted">
        New to Zaya?{' '}
        <Link href="/signup" className="font-medium text-primary hover:text-primary-hover">
          Create a workspace
        </Link>
      </p>
    </div>
  );
}
