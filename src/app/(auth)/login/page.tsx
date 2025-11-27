import { LoginForm } from './login-form';
import Link from 'next/link';

export default function LoginPage() {
  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">Welcome back</h2>
        <p className="text-muted-foreground">Sign in to your account to continue</p>
      </div>

      <LoginForm />

      <div className="text-center space-y-4">
        <Link href="/forgot-password" className="text-sm text-primary hover:underline">
          Forgot your password?
        </Link>

        <p className="text-sm text-muted-foreground">
          Don&apos;t have an account?{' '}
          <Link href="/signup" className="text-primary hover:underline font-medium">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
