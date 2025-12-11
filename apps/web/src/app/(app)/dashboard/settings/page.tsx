'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function SettingsPage() {
  const router = useRouter();

  useEffect(() => {
    // Use replace to avoid adding to browser history
    router.replace('/dashboard/settings/account');
  }, [router]);

  return null;
}
