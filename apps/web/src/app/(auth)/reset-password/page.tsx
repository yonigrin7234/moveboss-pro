import { ResetPasswordForm } from './reset-password-form';

export default function ResetPasswordPage() {
  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-semibold text-white tracking-tight">Set new password</h2>
        <p className="text-zinc-400">Enter your new password below</p>
      </div>

      <ResetPasswordForm />
    </div>
  );
}
