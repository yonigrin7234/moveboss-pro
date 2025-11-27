'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-client';
import { Button } from '@/components/ui/button';
import { LogOut, Loader2 } from 'lucide-react';

interface LogoutButtonProps {
  variant?: 'default' | 'ghost' | 'outline';
  showText?: boolean;
}

export function LogoutButton({ variant = 'ghost', showText = true }: LogoutButtonProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleLogout = async () => {
    setIsLoading(true);

    const supabase = createClient();
    await supabase.auth.signOut();

    router.push('/login');
    router.refresh();
  };

  return (
    <Button variant={variant} onClick={handleLogout} disabled={isLoading}>
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <LogOut className="h-4 w-4" />
      )}
      {showText && <span className="ml-2">Logout</span>}
    </Button>
  );
}
