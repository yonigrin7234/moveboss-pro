import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/supabase-server';
import { CommandPalette } from '@/components/CommandPalette';

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  return (
    <>
      {children}
      <CommandPalette />
    </>
  );
}
