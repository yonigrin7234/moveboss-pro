import { SignupForm } from './signup-form';
import Link from 'next/link';

export default function SignupPage() {
  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">Create an account</h2>
        <p className="text-muted-foreground">Get started with MoveBoss Pro</p>
      </div>

      <SignupForm />

      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{' '}
        <Link href="/login" className="text-primary hover:underline font-medium">
          Sign in
        </Link>
      </p>

      <p className="text-center text-xs text-muted-foreground">
        By signing up, you agree to our{' '}
        <Link href="/terms" className="underline hover:text-foreground">
          Terms of Service
        </Link>{' '}
        and{' '}
        <Link href="/privacy" className="underline hover:text-foreground">
          Privacy Policy
        </Link>
      </p>
    </div>
  );
}
