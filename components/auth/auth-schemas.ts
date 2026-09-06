import { z } from 'zod';

/**
 * Not a lib/contracts/* shape: Supabase Auth owns sign-up and sign-in, so there is
 * no `POST /workspace` request/response pair to freeze for it. These are local form
 * schemas only, kept next to the forms that use them.
 */
export const emailSchema = z.string().trim().min(1, 'Enter your email').email('Enter a valid email');
export const passwordSchema = z.string().min(8, 'Use at least 8 characters');

export const signUpSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});
export type SignUpInput = z.infer<typeof signUpSchema>;

export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Enter your password'),
});
export type SignInInput = z.infer<typeof signInSchema>;
