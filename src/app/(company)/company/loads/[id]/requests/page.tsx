import { cookies } from 'next/headers';
import { redirect, notFound } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import {
  getCompanyLoadWithDetails,
  getLoadRequestsForCompany,
} from '@/data/company-portal';
import { acceptLoadRequest, declineLoadRequest } from '@/data/marketplace';
import { checkCarrierCompliance } from '@/data/compliance-alerts';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  ArrowLeft,
  ArrowRight,
  Truck,
  Star,
  CheckCircle,
  XCircle,
  Clock,
  Package,
  Calendar,
  Shield,
} from 'lucide-react';
import { ReliabilityBadge } from '@/components/reliability-badge';
import { LoadRequestActions } from '@/components/load-request-actions';

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

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function LoadRequestsPage({ params }: PageProps) {
  const { id } = await params;
  const session = await getCompanySession();

  if (!session) {
    redirect('/company-login');
  }

  const load = await getCompanyLoadWithDetails(session.company_id, id);

  if (!load) {
    notFound();
  }

  const requests = await getLoadRequestsForCompany(id);
  const pendingRequests = requests.filter((r) => r.status === 'pending');
  const respondedRequests = requests.filter((r) => r.status !== 'pending');

  // Fetch compliance issues for each pending request's carrier
  const pendingRequestsWithCompliance = await Promise.all(
    pendingRequests.map(async (request) => {
      if (!request.carrier?.id) {
        return { ...request, complianceIssues: [] };
      }
      const { issues } = await checkCarrierCompliance(
        session.company_id,
        request.carrier.id
      );
      return { ...request, complianceIssues: issues };
    })
  );

  async function acceptAction(formData: FormData) {
    'use server';

    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('company_session');
    if (!sessionCookie) redirect('/company-login');

    const sessionData = JSON.parse(sessionCookie.value);
    const requestId = formData.get('request_id') as string;

    await acceptLoadRequest(requestId, sessionData.owner_id);

    revalidatePath(`/company/loads/${id}/requests`);
    revalidatePath('/company/requests');
    revalidatePath('/company/dashboard');
    redirect(`/company/loads/${id}`);
  }

  async function declineAction(formData: FormData) {
    'use server';

    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('company_session');
    if (!sessionCookie) redirect('/company-login');

    const sessionData = JSON.parse(sessionCookie.value);
    const requestId = formData.get('request_id') as string;
    const reason = formData.get('reason') as string;

    await declineLoadRequest(requestId, sessionData.owner_id, reason);

    revalidatePath(`/company/loads/${id}/requests`);
    revalidatePath('/company/requests');
  }

  // Extract load properties with proper types
  const loadNumber = load.load_number as string;
  const originCity = load.origin_city as string;
  const originState = load.origin_state as string;
  const originZip = load.origin_zip as string;
  const destCity = load.destination_city as string;
  const destState = load.destination_state as string;
  const destZip = load.destination_zip as string;
  const companyRate = load.company_rate as number | null;
  const estimatedCuft = load.estimated_cuft as number | null;
  const rateIsFixed = load.rate_is_fixed as boolean;
  const assignedCarrierId = load.assigned_carrier_id as string | null;
  const totalValue =
    companyRate && estimatedCuft ? companyRate * estimatedCuft : null;
  const carrier = load.carrier as { id: string; name: string; phone?: string } | null;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card sticky top-0 z-10">
        <div className="container flex items-center gap-4 h-14">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/company/requests">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="font-semibold">Carrier Requests</h1>
            <p className="text-xs text-muted-foreground">
              {loadNumber}
            </p>
          </div>
        </div>
      </header>

      <main className="container py-6 space-y-6 max-w-3xl">
        {/* Load Summary */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-semibold text-lg">
                    {originCity}, {originState} {originZip}
                  </p>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  <p className="font-semibold text-lg">
                    {destCity}, {destState} {destZip}
                  </p>
                </div>
                <p className="text-sm text-muted-foreground">
                  {estimatedCuft} CUFT
                  {companyRate && ` • $${companyRate}/cf`}
                  {totalValue && ` = $${totalValue.toLocaleString()}`}
                  {rateIsFixed ? ' (Fixed)' : ' (Open to Offers)'}
                </p>
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link href={`/company/loads/${id}`}>View Load</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Already Assigned */}
        {assignedCarrierId && (
          <Card className="border-green-500/30 bg-green-500/5">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <div>
                  <p className="font-medium">
                    Assigned to {carrier?.name}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    This load has been assigned to a carrier
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Pending Requests */}
        {pendingRequestsWithCompliance.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">
              Pending Requests ({pendingRequestsWithCompliance.length})
            </h2>

            {pendingRequestsWithCompliance.map((request) => (
              <Card key={request.id} className="border-yellow-500/20">
                <CardContent className="p-4 space-y-4">
                  {/* Carrier Info */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                        <Truck className="h-6 w-6 text-muted-foreground" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-lg">
                            {request.carrier?.name}
                          </p>
                          {request.is_partner ? (
                            <Badge className="bg-blue-500/20 text-blue-400">
                              <Star className="h-3 w-3 mr-1" />
                              Partner
                            </Badge>
                          ) : (
                            <Badge variant="outline">New</Badge>
                          )}
                          <ReliabilityBadge
                            loadsGivenBack={request.carrier?.loads_given_back ?? null}
                            loadsAcceptedTotal={request.carrier?.loads_accepted_total ?? null}
                          />
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {request.carrier?.city}, {request.carrier?.state}
                          {request.carrier?.mc_number &&
                            ` • MC# ${request.carrier.mc_number}`}
                        </p>
                      </div>
                    </div>

                    {/* Rate Offered */}
                    <div className="text-right">
                      {request.accepted_company_rate ? (
                        <div>
                          <p className="text-sm text-muted-foreground">
                            Accepted your rate
                          </p>
                          <p className="text-xl font-bold text-green-500">
                            ${companyRate?.toFixed(2)}/cf
                          </p>
                        </div>
                      ) : (
                        <div>
                          <p className="text-sm text-muted-foreground">
                            Their offer
                          </p>
                          <p className="text-xl font-bold text-purple-500">
                            ${request.offered_rate?.toFixed(2)}/cf
                          </p>
                          {companyRate &&
                            request.offered_rate &&
                            request.offered_rate > companyRate && (
                              <p className="text-xs text-red-400">
                                +$
                                {(
                                  (request.offered_rate - companyRate) *
                                  (estimatedCuft || 0)
                                ).toFixed(0)}{' '}
                                more
                              </p>
                            )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Platform Stats */}
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1">
                      <Package className="h-4 w-4 text-muted-foreground" />
                      <span>
                        {request.carrier?.platform_loads_completed || 0} loads
                        on platform
                      </span>
                    </div>
                    {request.carrier?.platform_rating && (
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 text-yellow-500" />
                        <span>
                          {request.carrier.platform_rating.toFixed(1)}
                        </span>
                      </div>
                    )}
                    {request.carrier?.platform_member_since && (
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span>
                          Since{' '}
                          {new Date(
                            request.carrier.platform_member_since
                          ).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Message */}
                  {request.message && (
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <p className="text-sm italic">&quot;{request.message}&quot;</p>
                    </div>
                  )}

                  {/* New Carrier Warning */}
                  {!request.is_partner && (
                    <div className="flex items-start gap-2 p-3 bg-yellow-500/10 rounded-lg">
                      <Shield className="h-4 w-4 text-yellow-500 mt-0.5" />
                      <div className="text-sm">
                        <p className="font-medium text-yellow-600">
                          First time working together
                        </p>
                        <p className="text-muted-foreground">
                          Accepting will automatically add them as a partner and
                          request compliance documents (W-9, Hauling Agreement).
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Actions with Compliance Check */}
                  <LoadRequestActions
                    requestId={request.id}
                    acceptedCompanyRate={request.accepted_company_rate}
                    offeredRate={request.offered_rate}
                    complianceIssues={request.complianceIssues}
                    blockOnExpired={false}
                    acceptAction={acceptAction}
                    declineAction={declineAction}
                  />

                  <p className="text-xs text-muted-foreground text-center">
                    Requested {new Date(request.created_at).toLocaleString()}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* No Pending Requests */}
        {pendingRequestsWithCompliance.length === 0 && !assignedCarrierId && (
          <Card>
            <CardContent className="p-8 text-center">
              <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-semibold mb-2">No pending requests</h3>
              <p className="text-muted-foreground">
                Carriers haven&apos;t requested this load yet
              </p>
            </CardContent>
          </Card>
        )}

        {/* Past Requests */}
        {respondedRequests.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-muted-foreground">
              Past Requests ({respondedRequests.length})
            </h2>

            {respondedRequests.map((request) => {
              const isAccepted = request.status === 'accepted';

              return (
                <Card key={request.id} className="opacity-60">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                          <Truck className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="font-medium">{request.carrier?.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {request.accepted_company_rate
                              ? `Accepted $${companyRate}/cf`
                              : `Offered $${request.offered_rate}/cf`}
                          </p>
                        </div>
                      </div>
                      <Badge
                        className={
                          isAccepted
                            ? 'bg-green-500/20 text-green-400'
                            : 'bg-red-500/20 text-red-400'
                        }
                      >
                        {isAccepted ? (
                          <>
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Accepted
                          </>
                        ) : (
                          <>
                            <XCircle className="h-3 w-3 mr-1" />
                            Declined
                          </>
                        )}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
