"use client";

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase-client';

export function WorkspaceEscape() {
  const router = useRouter();

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" onClick={handleSignOut} className="h-9">
        Back to login
      </Button>
    </div>
  );
}
