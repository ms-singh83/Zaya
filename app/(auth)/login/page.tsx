import type { Metadata } from 'next';
import { LoginForm } from './login-form';

export const metadata: Metadata = { title: 'Sign in, Zaya' };

export default function LoginPage() {
  return <LoginForm />;
}
