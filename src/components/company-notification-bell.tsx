import Link from 'next/link';
import { cookies } from 'next/headers';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getUnreadCompanyNotificationCount } from '@/data/notifications';

async function getCompanySession() {
  const cookieStore = await cookies();
  const session = cookieStore.get('company_session');
  if (!session) return null;
  try {
    return JSON.parse(session.value);
  } catch {
    return null;
  }
}

export async function CompanyNotificationBell() {
  const session = await getCompanySession();

  if (!session) return null;

  const unreadCount = await getUnreadCompanyNotificationCount(session.company_id);

  return (
    <Button variant="ghost" size="icon" asChild className="relative">
      <Link href="/company/notifications">
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </Link>
    </Button>
  );
}
