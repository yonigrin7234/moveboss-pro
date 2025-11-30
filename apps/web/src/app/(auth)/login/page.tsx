import { LoginForm } from './login-form';
import Link from 'next/link';

export default function LoginPage() {
  return (
    <div className="space-y-8">
      {/* Header with visual hierarchy */}
      <div className="text-center space-y-3">
        <p className="text-xs font-medium tracking-widest text-zinc-500 uppercase">
          MoveBoss Pro
        </p>
        <h2 className="text-2xl font-semibold text-white tracking-tight">
          Sign in to your workspace
        </h2>
        <p className="text-zinc-500 text-sm">
          Secure access for your team and operation.
        </p>
      </div>

      <LoginForm />

      {/* Trust cue */}
      <p className="text-center text-xs text-zinc-600">
        Used by growing moving companies to run their daily operations.
      </p>

      <div className="text-center space-y-3 pt-2">
        <Link href="/forgot-password" className="text-sm text-zinc-400 hover:text-white transition-colors">
          Forgot your password?
        </Link>

        <p className="text-sm text-zinc-500">
          Don&apos;t have an account?{' '}
          <Link href="/signup" className="text-white hover:text-zinc-300 transition-colors font-medium">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
