import Link from 'next/link';
import { ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface AccessDeniedProps {
  title?: string;
  message?: string;
}

export function AccessDenied({
  title = 'Access Denied',
  message = "You don't have permission to access this page. Contact your administrator to request access.",
}: AccessDeniedProps) {
  return (
    <Card className="max-w-md mx-auto mt-12">
      <CardContent className="p-8 text-center">
        <ShieldAlert className="h-12 w-12 mx-auto mb-4 text-destructive" />
        <h1 className="text-xl font-semibold mb-2">{title}</h1>
        <p className="text-muted-foreground mb-6">{message}</p>
        <Button asChild>
          <Link href="/dashboard">Go to Dashboard</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
