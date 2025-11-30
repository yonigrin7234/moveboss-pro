import { ForgotPasswordForm } from './forgot-password-form';
import Link from 'next/link';

export default function ForgotPasswordPage() {
  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-semibold text-white tracking-tight">Reset your password</h2>
        <p className="text-zinc-400">
          Enter your email and we&apos;ll send you a reset link
        </p>
      </div>

      <ForgotPasswordForm />

      <p className="text-center text-sm text-zinc-500">
        Remember your password?{' '}
        <Link href="/login" className="text-white hover:text-zinc-300 transition-colors font-medium">
          Sign in
        </Link>
      </p>
    </div>
  );
}
