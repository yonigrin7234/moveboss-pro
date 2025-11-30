import { LoginForm } from './login-form';
import Link from 'next/link';

export default function LoginPage() {
  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-semibold text-white tracking-tight">Welcome back</h2>
        <p className="text-zinc-400">Sign in to your account to continue</p>
      </div>

      <LoginForm />

      <div className="text-center space-y-4">
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
