'use client';

import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-client';

export function SignOutButton() {
  const router = useRouter();

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  return (
    <button
      onClick={handleSignOut}
      className="px-4 py-2 text-sm text-foreground bg-card border border-border rounded-md hover:bg-muted transition-colors"
    >
      Sign out
    </button>
  );
}

