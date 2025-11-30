import { LoginForm } from './login-form';
import Link from 'next/link';

export default function LoginPage() {
  return (
    <div className="w-full text-center">
      <span className="inline-block text-[11px] font-semibold tracking-[0.12em] text-sky-500 mb-3.5">
        MOVEBOSS PRO
      </span>
      <h2 className="text-[26px] font-semibold text-white mb-2 tracking-tight">
        Sign in to your workspace
      </h2>
      <p className="text-[15px] text-white/45 mb-7">
        Secure access for your team and operation.
      </p>

      <LoginForm />

      {/* Trust cue */}
      <p className="text-xs text-white/35 mt-5">
        Used by growing moving companies to run their daily operations.
      </p>

      <div className="mt-6 space-y-3.5">
        <Link
          href="/forgot-password"
          className="text-[13px] text-white/40 hover:text-white/60 transition-colors"
        >
          Forgot your password?
        </Link>

        <p className="text-[13px] text-white/45">
          Don&apos;t have an account?{' '}
          <Link
            href="/signup"
            className="text-sky-500 hover:underline font-medium"
          >
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
