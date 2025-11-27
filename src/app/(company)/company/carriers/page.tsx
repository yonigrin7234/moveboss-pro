import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getCompanyCarrierPartners } from '@/data/company-portal';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Truck, Building2, MapPin, Package } from 'lucide-react';

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

export default async function CompanyCarriersPage() {
  const session = await getCompanySession();

  if (!session) {
    redirect('/company-login');
  }

  const carrierPartners = await getCompanyCarrierPartners(session.company_id);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card sticky top-0 z-10">
        <div className="container flex items-center gap-4 h-14">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/company/dashboard">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <h1 className="font-semibold">My Carriers</h1>
        </div>
      </header>

      <main className="container py-6 max-w-3xl">
        {carrierPartners.length > 0 ? (
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Truck className="h-5 w-5" />
                  Carrier Partners ({carrierPartners.length})
                </CardTitle>
                <CardDescription>
                  These carriers can be assigned to your loads
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {carrierPartners.map((p) => {
                    const partner = p.partner;
                    if (!partner) return null;

                    return (
                      <div
                        key={p.id}
                        className="flex items-center justify-between p-4 bg-muted/50 rounded-lg"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{partner.name}</span>
                          </div>
                          {partner.mc_number && (
                            <p className="text-sm text-muted-foreground">
                              MC# {partner.mc_number}
                            </p>
                          )}
                          {(partner.city || partner.state) && (
                            <p className="text-sm text-muted-foreground flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {[partner.city, partner.state].filter(Boolean).join(', ')}
                            </p>
                          )}
                        </div>
                        <div className="text-right space-y-1">
                          {p.total_loads > 0 && (
                            <Badge variant="outline" className="flex items-center gap-1">
                              <Package className="h-3 w-3" />
                              {p.total_loads} loads
                            </Badge>
                          )}
                          {p.default_rate_amount && (
                            <p className="text-xs text-muted-foreground">
                              Default: ${p.default_rate_amount}
                              {p.default_rate_type && ` (${p.default_rate_type})`}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <p className="text-sm text-muted-foreground text-center">
              To add new carrier partners, contact your account administrator or use the main dashboard.
            </p>
          </div>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <Truck className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h2 className="text-lg font-semibold mb-2">No Carrier Partners</h2>
              <p className="text-muted-foreground max-w-sm mx-auto">
                You don&apos;t have any carrier partners set up yet. Contact your account
                administrator to add carrier partnerships.
              </p>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
