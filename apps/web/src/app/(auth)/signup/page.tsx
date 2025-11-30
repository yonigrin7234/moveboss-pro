import { SignupForm } from './signup-form';
import Link from 'next/link';

export default function SignupPage() {
  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-semibold text-white tracking-tight">Create an account</h2>
        <p className="text-zinc-400">Get started with MoveBoss</p>
      </div>

      <SignupForm />

      <p className="text-center text-sm text-zinc-500">
        Already have an account?{' '}
        <Link href="/login" className="text-white hover:text-zinc-300 transition-colors font-medium">
          Sign in
        </Link>
      </p>

      <p className="text-center text-xs text-zinc-600">
        By signing up, you agree to our{' '}
        <Link href="/terms" className="text-zinc-500 hover:text-zinc-300 transition-colors">
          Terms of Service
        </Link>{' '}
        and{' '}
        <Link href="/privacy" className="text-zinc-500 hover:text-zinc-300 transition-colors">
          Privacy Policy
        </Link>
      </p>
    </div>
  );
}
