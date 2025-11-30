import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { revalidatePath } from 'next/cache';
import { getCurrentUser } from '@/lib/supabase-server';
import { getMarketplaceLoadWithRequestStatus, createLoadRequest, withdrawLoadRequest } from '@/data/marketplace';
import { getWorkspaceCompanyForUser } from '@/data/companies';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LoadRequestForm } from '@/components/loads/LoadRequestForm';
import {
  ArrowLeft,
  MapPin,
  Package,
  Building2,
  Clock,
  Zap,
  Truck,
  Star,
  ArrowRight,
  CheckCircle,
  XCircle,
  DollarSign,
  Calendar,
  Warehouse,
  Key,
  AlertTriangle,
  Ban,
} from 'lucide-react';

function formatRate(rate: number | null, rateType: string): string {
  if (!rate) return 'Make an offer';
  const formatted = rate.toLocaleString('en-US', { minimumFractionDigits: 2 });
  if (rateType === 'flat') return `$${formatted} flat`;
  if (rateType === 'per_cuft') return `$${formatted}/cuft`;
  if (rateType === 'per_lb') return `$${formatted}/lb`;
  return `$${formatted}`;
}

function timeAgo(dateString: string) {
  const now = new Date();
  const then = new Date(dateString);
  const seconds = Math.floor((now.getTime() - then.getTime()) / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return 'Just now';
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function LoadDetailPage({ params }: PageProps) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const workspaceCompany = await getWorkspaceCompanyForUser(user.id);
  if (!workspaceCompany) {
    redirect('/onboarding/workspace');
  }

  const load = await getMarketplaceLoadWithRequestStatus(id, user.id);
  if (!load) {
    notFound();
  }

  const company = Array.isArray(load.company) ? load.company[0] : load.company;

  // Server action to submit request
  async function submitRequest(
    _prevState: { error?: string; success?: boolean } | null,
    formData: FormData
  ): Promise<{ error?: string; success?: boolean } | null> {
    'use server';

    const user = await getCurrentUser();
    if (!user) return { error: 'Not authenticated' };

    const workspaceCompany = await getWorkspaceCompanyForUser(user.id);
    if (!workspaceCompany) return { error: 'No workspace company found' };

    const requestType = formData.get('request_type') as 'accept_listed' | 'counter_offer';
    const counterOfferRate = requestType === 'counter_offer'
      ? parseFloat(formData.get('counter_offer_rate') as string)
      : undefined;
    const message = formData.get('message') as string;

    // Get date values
    const proposedLoadDateStart = formData.get('proposed_load_date_start') as string || undefined;
    const proposedLoadDateEnd = formData.get('proposed_load_date_end') as string || undefined;
    const proposedDeliveryDateStart = formData.get('proposed_delivery_date_start') as string || undefined;
    const proposedDeliveryDateEnd = formData.get('proposed_delivery_date_end') as string || undefined;

    const result = await createLoadRequest(user.id, workspaceCompany.id, {
      load_id: id,
      request_type: requestType,
      counter_offer_rate: counterOfferRate,
      accepted_company_rate: requestType === 'accept_listed',
      proposed_load_date_start: proposedLoadDateStart,
      proposed_load_date_end: proposedLoadDateEnd,
      proposed_delivery_date_start: proposedDeliveryDateStart,
      proposed_delivery_date_end: proposedDeliveryDateEnd,
      message: message || undefined,
    });

    if (!result.success) {
      return { error: result.error || 'Failed to submit request' };
    }

    revalidatePath(`/dashboard/load-board/${id}`);
    return { success: true };
  }

  // Server action to withdraw request
  async function withdrawRequest() {
    'use server';

    const user = await getCurrentUser();
    if (!user) redirect('/login');

    const load = await getMarketplaceLoadWithRequestStatus(id, user.id);
    if (!load?.my_request_id) return;

    await withdrawLoadRequest(load.my_request_id);
    revalidatePath(`/dashboard/load-board/${id}`);
  }

  const hasExistingRequest = load.my_request_status === 'pending';
  const requestAccepted = load.my_request_status === 'accepted';
  const requestDeclined = load.my_request_status === 'declined' || load.my_request_status === 'withdrawn';

  return (
    <div className="space-y-6">
      {/* Back Link */}
      <Link
        href="/dashboard/load-board"
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4 mr-1" />
        Back to Load Board
      </Link>

      {/* Load Header */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-2xl font-bold mb-2">
            <MapPin className="h-5 w-5" />
            <span>{load.origin_city}, {load.origin_state}</span>
            <ArrowRight className="h-5 w-5 text-muted-foreground" />
            <span>{load.destination_city}, {load.destination_state}</span>
          </div>
          <p className="text-muted-foreground">
            Load #{load.load_number} • Posted {timeAgo(load.posted_to_marketplace_at)}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {load.is_ready_now && (
            <Badge className="bg-green-500/20 text-green-600 dark:text-green-400">
              <Zap className="h-3 w-3 mr-1" />
              Ready Now
            </Badge>
          )}
          {load.delivery_urgency === 'expedited' && (
            <Badge className="bg-red-500/20 text-red-600 dark:text-red-400">
              <Clock className="h-3 w-3 mr-1" />
              Expedited
            </Badge>
          )}
          {load.delivery_urgency === 'flexible' && (
            <Badge className="bg-blue-500/20 text-blue-600 dark:text-blue-400">
              Flexible
            </Badge>
          )}
          {load.equipment_type && (
            <Badge variant="outline">
              <Truck className="h-3 w-3 mr-1" />
              {load.equipment_type === 'box_truck' ? 'Box Truck' : 'Semi Trailer'}
            </Badge>
          )}
          {load.truck_requirement === 'semi_only' && (
            <Badge className="bg-indigo-500/20 text-indigo-600 dark:text-indigo-400">
              🚛 Semi Only
            </Badge>
          )}
          {load.truck_requirement === 'box_truck_only' && (
            <Badge className="bg-amber-500/20 text-amber-600 dark:text-amber-400">
              📦 Box Truck Only
            </Badge>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Company Info Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Posted By
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-lg font-semibold">{company?.name || 'Unknown Company'}</p>
                  {company?.city && company?.state && (
                    <p className="text-muted-foreground">{company.city}, {company.state}</p>
                  )}
                </div>
                {company?.platform_rating && (
                  <div className="text-right">
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
                      <span className="font-semibold">{company.platform_rating.toFixed(1)}</span>
                    </div>
                    {company.platform_loads_completed > 0 && (
                      <p className="text-sm text-muted-foreground">
                        {company.platform_loads_completed} loads completed
                      </p>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Load Details Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Load Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Origin</p>
                  <p className="font-medium">{load.origin_city}, {load.origin_state}</p>
                  <p className="text-sm text-muted-foreground">{load.origin_zip}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Destination</p>
                  <p className="font-medium">{load.destination_city}, {load.destination_state}</p>
                  <p className="text-sm text-muted-foreground">{load.destination_zip}</p>
                </div>
                {load.estimated_cuft && (
                  <div>
                    <p className="text-sm text-muted-foreground">Size</p>
                    <p className="font-medium">{load.estimated_cuft.toLocaleString()} cuft</p>
                    {load.estimated_weight_lbs && (
                      <p className="text-sm text-muted-foreground">
                        ~{load.estimated_weight_lbs.toLocaleString()} lbs
                      </p>
                    )}
                  </div>
                )}
                {load.pieces_count && (
                  <div>
                    <p className="text-sm text-muted-foreground">Pieces</p>
                    <p className="font-medium">{load.pieces_count}</p>
                  </div>
                )}
              </div>

              {load.available_date && (
                <div className="flex items-center gap-2 pt-2 border-t">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    Available: {new Date(load.available_date).toLocaleDateString('en-US', {
                      weekday: 'long',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </span>
                </div>
              )}

              {load.special_instructions && (
                <div className="pt-2 border-t">
                  <p className="text-sm text-muted-foreground mb-1">Special Instructions</p>
                  <p className="text-sm">{load.special_instructions}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Equipment Requirement Card */}
          {load.truck_requirement && load.truck_requirement !== 'any' && (
            <Card className={load.truck_requirement === 'semi_only' ? 'border-indigo-500/30' : 'border-amber-500/30'}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Truck className="h-5 w-5" />
                  Equipment Requirement
                </CardTitle>
              </CardHeader>
              <CardContent>
                {load.truck_requirement === 'semi_only' && (
                  <div className="flex items-start gap-3">
                    <div className="text-3xl">🚛</div>
                    <div>
                      <p className="font-semibold text-lg">Semi Truck Required</p>
                      <p className="text-sm text-muted-foreground">
                        This load requires a 53&apos; trailer. Box trucks and smaller vehicles cannot be used.
                      </p>
                    </div>
                  </div>
                )}
                {load.truck_requirement === 'box_truck_only' && (
                  <div className="flex items-start gap-3">
                    <div className="text-3xl">📦</div>
                    <div>
                      <p className="font-semibold text-lg">Box Truck Only</p>
                      <p className="text-sm text-muted-foreground">
                        This load requires a box truck. Semi trucks and trailers cannot be used due to access restrictions.
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Storage Information Card (for RFD loads) */}
          {(load.load_type === 'rfd' || load.load_subtype === 'rfd' || load.storage_location) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Warehouse className="h-5 w-5" />
                  Storage Pickup Location
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {(() => {
                  const storage = Array.isArray(load.storage_location)
                    ? load.storage_location[0]
                    : load.storage_location;

                  if (storage) {
                    return (
                      <>
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-semibold text-lg">{storage.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {storage.address_line1 && `${storage.address_line1}, `}
                              {storage.city}, {storage.state} {storage.zip}
                            </p>
                            {storage.facility_brand && (
                              <Badge variant="outline" className="mt-1 capitalize">
                                {storage.facility_brand.replace('_', ' ')}
                              </Badge>
                            )}
                          </div>
                          {storage.truck_accessibility && (
                            <Badge
                              variant="outline"
                              className={
                                storage.truck_accessibility === 'full'
                                  ? 'bg-green-500/20 text-green-600 dark:text-green-400'
                                  : storage.truck_accessibility === 'limited'
                                    ? 'bg-yellow-500/20 text-yellow-600 dark:text-yellow-400'
                                    : 'bg-red-500/20 text-red-600 dark:text-red-400'
                              }
                            >
                              {storage.truck_accessibility === 'full' && (
                                <>
                                  <Truck className="h-3 w-3 mr-1" />
                                  Full Truck Access
                                </>
                              )}
                              {storage.truck_accessibility === 'limited' && (
                                <>
                                  <AlertTriangle className="h-3 w-3 mr-1" />
                                  Limited Access
                                </>
                              )}
                              {storage.truck_accessibility === 'none' && (
                                <>
                                  <Ban className="h-3 w-3 mr-1" />
                                  No Truck Access
                                </>
                              )}
                            </Badge>
                          )}
                        </div>

                        {(load.storage_unit || storage.unit_numbers) && (
                          <div className="flex items-center gap-2 text-sm">
                            <Key className="h-4 w-4 text-muted-foreground" />
                            <span className="text-muted-foreground">Unit:</span>
                            <span className="font-mono bg-muted px-2 py-0.5 rounded">
                              {load.storage_unit || storage.unit_numbers}
                            </span>
                          </div>
                        )}

                        <div className="grid grid-cols-2 gap-4 pt-2 border-t">
                          {storage.access_hours && (
                            <div>
                              <p className="text-sm text-muted-foreground">Access Hours</p>
                              <p className="text-sm font-medium">{storage.access_hours}</p>
                            </div>
                          )}
                          {storage.operating_hours && (
                            <div>
                              <p className="text-sm text-muted-foreground">Operating Hours</p>
                              <p className="text-sm font-medium">{storage.operating_hours}</p>
                            </div>
                          )}
                        </div>

                        {storage.gate_code && (
                          <div className="p-3 bg-muted/50 rounded-lg">
                            <p className="text-sm text-muted-foreground mb-1">Gate Code</p>
                            <p className="font-mono text-lg">{storage.gate_code}</p>
                          </div>
                        )}

                        {storage.access_instructions && (
                          <div>
                            <p className="text-sm text-muted-foreground mb-1">Access Instructions</p>
                            <p className="text-sm">{storage.access_instructions}</p>
                          </div>
                        )}

                        {storage.has_loading_dock && (
                          <div className="flex items-center gap-2 text-sm">
                            <Truck className="h-4 w-4 text-muted-foreground" />
                            <span>Loading dock available</span>
                            {storage.dock_height && (
                              <span className="text-muted-foreground">({storage.dock_height})</span>
                            )}
                          </div>
                        )}

                        {storage.appointment_required && (
                          <div className="p-3 border border-yellow-500/30 bg-yellow-500/5 rounded-lg">
                            <div className="flex items-center gap-2 text-yellow-600 dark:text-yellow-400 font-medium">
                              <Clock className="h-4 w-4" />
                              Appointment Required
                            </div>
                            {storage.appointment_instructions && (
                              <p className="text-sm mt-1">{storage.appointment_instructions}</p>
                            )}
                          </div>
                        )}

                        {storage.accessibility_notes && (
                          <div>
                            <p className="text-sm text-muted-foreground mb-1">Accessibility Notes</p>
                            <p className="text-sm">{storage.accessibility_notes}</p>
                          </div>
                        )}
                      </>
                    );
                  } else if (load.current_storage_location) {
                    // Fallback for loads without linked storage location
                    return (
                      <div>
                        <p className="font-medium">{load.current_storage_location}</p>
                        <p className="text-sm text-muted-foreground">
                          {load.origin_city}, {load.origin_state} {load.origin_zip}
                        </p>
                        {load.storage_unit && (
                          <p className="text-sm mt-2">
                            <span className="text-muted-foreground">Unit: </span>
                            <span className="font-mono">{load.storage_unit}</span>
                          </p>
                        )}
                      </div>
                    );
                  }

                  return (
                    <p className="text-muted-foreground">
                      Pickup from storage in {load.origin_city}, {load.origin_state}
                    </p>
                  );
                })()}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Request Sidebar */}
        <div className="space-y-6">
          {/* Rate Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Rate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">
                {formatRate(load.company_rate, load.company_rate_type)}
              </p>
              {load.rate_is_fixed ? (
                <p className="text-sm text-muted-foreground mt-1">Fixed rate - no negotiation</p>
              ) : (
                <p className="text-sm text-muted-foreground mt-1">Open to offers</p>
              )}
            </CardContent>
          </Card>

          {/* Request Status or Form */}
          {requestAccepted ? (
            <Card className="border-green-500/30 bg-green-500/5">
              <CardContent className="p-6 text-center">
                <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-4" />
                <h3 className="text-lg font-semibold mb-2">Request Accepted!</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Your request has been accepted. Check your loads for next steps.
                </p>
                <Button asChild>
                  <Link href="/dashboard/loads">View My Loads</Link>
                </Button>
              </CardContent>
            </Card>
          ) : requestDeclined ? (
            <Card className="border-red-500/30 bg-red-500/5">
              <CardContent className="p-6 text-center">
                <XCircle className="h-12 w-12 mx-auto text-red-500 mb-4" />
                <h3 className="text-lg font-semibold mb-2">Request {load.my_request_status === 'withdrawn' ? 'Withdrawn' : 'Declined'}</h3>
                <p className="text-sm text-muted-foreground">
                  {load.my_request_status === 'withdrawn'
                    ? 'You withdrew your request for this load.'
                    : 'Your request was not accepted for this load.'}
                </p>
              </CardContent>
            </Card>
          ) : hasExistingRequest ? (
            <Card className="border-yellow-500/30 bg-yellow-500/5">
              <CardContent className="p-6 text-center">
                <Clock className="h-12 w-12 mx-auto text-yellow-500 mb-4" />
                <h3 className="text-lg font-semibold mb-2">Request Pending</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  You already have a pending request for this load. The company will review and respond.
                </p>
                <form action={withdrawRequest}>
                  <Button variant="outline" type="submit" className="w-full">
                    Withdraw Request
                  </Button>
                </form>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Request This Load</CardTitle>
              </CardHeader>
              <CardContent>
                <LoadRequestForm
                  loadId={load.id}
                  companyRate={load.company_rate}
                  companyRateType={load.company_rate_type}
                  isOpenToCounter={load.is_open_to_counter}
                  onSubmit={submitRequest}
                />
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
