import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifyCompanyPortalLogin } from '@/data/company-portal';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Building2, AlertCircle } from 'lucide-react';

export default async function CompanyLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const error = params.error;

  async function loginAction(formData: FormData) {
    'use server';

    const email = formData.get('email') as string;
    const accessCode = formData.get('access_code') as string;

    const result = await verifyCompanyPortalLogin(email, accessCode);

    if (result.success && result.company) {
      // Set session cookie
      const cookieStore = await cookies();
      cookieStore.set(
        'company_session',
        JSON.stringify({
          company_id: result.company.company_id,
          company_name: result.company.name,
          owner_id: result.company.owner_id,
          email: result.company.email,
          is_broker: result.company.is_broker,
          is_agent: result.company.is_agent,
          is_carrier: result.company.is_carrier,
        }),
        {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 60 * 60 * 24 * 7, // 7 days
        }
      );

      redirect('/company/dashboard');
    }

    redirect('/company-login?error=invalid');
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Building2 className="h-8 w-8 text-primary" />
            </div>
          </div>
          <CardTitle>Company Portal</CardTitle>
          <CardDescription>
            Sign in to manage your loads and track deliveries
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="flex items-center gap-2 p-3 mb-4 bg-red-500/10 text-red-600 dark:text-red-400 rounded-lg text-sm">
              <AlertCircle className="h-4 w-4" />
              Invalid email or access code
            </div>
          )}

          <form action={loginAction} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="dispatch@yourcompany.com"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="access_code">Access Code</Label>
              <Input
                id="access_code"
                name="access_code"
                type="password"
                placeholder="Your access code"
                required
              />
              <p className="text-xs text-muted-foreground">
                Contact your account manager if you need your access code
              </p>
            </div>

            <Button type="submit" className="w-full">
              Sign In
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
