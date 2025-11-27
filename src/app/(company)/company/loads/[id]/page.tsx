import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import Link from 'next/link';
import Image from 'next/image';
import {
  getCompanyLoadDetail,
  getCompanyCarrierPartners,
  assignLoadToCarrier,
  unassignCarrierFromLoad,
} from '@/data/company-portal';
import { cancelCarrierAssignment } from '@/data/cancellations';
import { getRatingForLoad, submitRating } from '@/data/ratings';
import { getLoadPhotos } from '@/data/load-photos';
import { RatingForm } from '@/components/rating-form';
import { RatingStars } from '@/components/rating-stars';
import { PhotoGallery } from '@/components/photo-gallery';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ArrowLeft,
  Package,
  MapPin,
  Truck,
  DollarSign,
  Calendar,
  CheckCircle,
  Clock,
  FileSignature,
  Camera,
  AlertCircle,
  Warehouse,
  Users,
  User,
  Phone,
  XCircle,
  Navigation,
  Star,
} from 'lucide-react';

const cancelReasonOptions = [
  { value: 'customer_canceled', label: 'Customer canceled move' },
  { value: 'load_rescheduled', label: 'Load rescheduled' },
  { value: 'carrier_performance', label: 'Carrier performance issue' },
  { value: 'reassigning', label: 'Reassigning to another carrier' },
  { value: 'other', label: 'Other' },
];

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

const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pending: {
    label: 'Pending',
    color: 'bg-gray-500/20 text-gray-400',
    icon: <Clock className="h-4 w-4" />,
  },
  accepted: {
    label: 'Accepted',
    color: 'bg-blue-500/20 text-blue-400',
    icon: <CheckCircle className="h-4 w-4" />,
  },
  loading: {
    label: 'Loading',
    color: 'bg-yellow-500/20 text-yellow-400',
    icon: <Package className="h-4 w-4" />,
  },
  loaded: {
    label: 'Loaded',
    color: 'bg-orange-500/20 text-orange-400',
    icon: <Truck className="h-4 w-4" />,
  },
  in_transit: {
    label: 'In Transit',
    color: 'bg-purple-500/20 text-purple-400',
    icon: <Truck className="h-4 w-4" />,
  },
  delivered: {
    label: 'Delivered',
    color: 'bg-green-500/20 text-green-400',
    icon: <CheckCircle className="h-4 w-4" />,
  },
};

function getStatusOrder(status: string): number {
  const order: Record<string, number> = {
    pending: 0,
    accepted: 1,
    loading: 2,
    loaded: 3,
    in_transit: 4,
    delivered: 5,
  };
  return order[status] ?? 0;
}

export default async function CompanyLoadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getCompanySession();

  if (!session) {
    redirect('/company-login');
  }

  const [load, carrierPartners, existingRating, photos] = await Promise.all([
    getCompanyLoadDetail(session.company_id, id),
    getCompanyCarrierPartners(session.company_id),
    getRatingForLoad(id, session.company_id),
    getLoadPhotos(id),
  ]);

  if (!load) {
    redirect('/company/dashboard');
  }

  const carrier = load.carrier as { id: string; name: string; mc_number?: string } | null;
  const storageLocation = load.storage_location as { id: string; name: string; city: string; state: string } | null;
  const status = statusConfig[load.load_status as string] || statusConfig.pending;

  // Filter photos by type
  const loadingPhotos = photos.filter(
    (p) => p.photo_type === 'loading' || p.photo_type === 'loaded'
  );
  const deliveryPhotos = photos.filter((p) => p.photo_type === 'delivery');
  const canAssignCarrier = load.load_status === 'pending';
  const canUnassign = load.load_status === 'pending' && load.assigned_carrier_id;
  // Can cancel carrier if load is confirmed but not yet in transit or delivered
  const canCancelCarrier = load.assigned_carrier_id &&
    load.carrier_confirmed_at &&
    ['accepted', 'loading'].includes(load.load_status as string);

  async function assignCarrierAction(formData: FormData) {
    'use server';

    const loadId = formData.get('load_id') as string;
    const carrierId = formData.get('carrier_id') as string;
    const carrierRate = parseFloat(formData.get('carrier_rate') as string) || undefined;
    const carrierRateType = (formData.get('carrier_rate_type') as string) || undefined;

    if (!carrierId || carrierId === 'none') {
      return;
    }

    await assignLoadToCarrier(loadId, carrierId, carrierRate, carrierRateType);
    revalidatePath(`/company/loads/${loadId}`);
    revalidatePath('/company/dashboard');
  }

  async function unassignCarrierAction(formData: FormData) {
    'use server';

    const loadId = formData.get('load_id') as string;
    await unassignCarrierFromLoad(loadId);
    revalidatePath(`/company/loads/${loadId}`);
    revalidatePath('/company/dashboard');
  }

  async function cancelCarrierAction(formData: FormData) {
    'use server';

    const currentSession = await getCompanySession();
    if (!currentSession) throw new Error('Not authenticated');

    const loadId = formData.get('load_id') as string;
    const reasonCode = formData.get('reason_code') as string;
    const repostValue = formData.get('repost_to_marketplace') as string;
    const repostToMarketplace = repostValue === 'true';

    if (!loadId || !reasonCode) {
      throw new Error('Missing required fields');
    }

    const result = await cancelCarrierAssignment(
      loadId,
      currentSession.owner_id,
      currentSession.company_id,
      reasonCode,
      undefined,
      repostToMarketplace
    );

    if (!result.success) {
      throw new Error(result.error || 'Failed to cancel carrier');
    }

    revalidatePath(`/company/loads/${loadId}`);
    revalidatePath('/company/dashboard');
  }

  async function submitRatingAction(formData: FormData) {
    'use server';

    const loadId = formData.get('load_id') as string;
    const raterCompanyId = formData.get('rater_company_id') as string;
    const ratedCompanyId = formData.get('rated_company_id') as string;
    const raterType = formData.get('rater_type') as 'shipper' | 'carrier';
    const rating = parseInt(formData.get('rating') as string, 10);
    const comment = formData.get('comment') as string | undefined;

    if (!loadId || !raterCompanyId || !ratedCompanyId || !rating) {
      throw new Error('Missing required fields');
    }

    const result = await submitRating(
      loadId,
      raterCompanyId,
      ratedCompanyId,
      rating,
      raterType,
      comment
    );

    if (!result.success) {
      throw new Error(result.error || 'Failed to submit rating');
    }

    revalidatePath(`/company/loads/${loadId}`);
  }

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
          <div className="flex-1">
            <h1 className="font-semibold">{load.load_number}</h1>
            {load.internal_reference && (
              <p className="text-xs text-muted-foreground">Ref: {load.internal_reference}</p>
            )}
          </div>
          <Badge className={status.color}>
            {status.icon}
            <span className="ml-1">{status.label}</span>
          </Badge>
        </div>
      </header>

      <main className="container py-6 space-y-6 max-w-3xl">
        {/* Route Info */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary" />
              Route
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Pickup</p>
                <p className="font-medium">
                  {load.origin_city}, {load.origin_state} {load.origin_zip}
                </p>
                {storageLocation && (
                  <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                    <Warehouse className="h-3 w-3" />
                    {storageLocation.name}
                    {load.storage_unit && ` - ${load.storage_unit}`}
                  </p>
                )}
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Delivery</p>
                <p className="font-medium">
                  {load.destination_city}, {load.destination_state} {load.destination_zip}
                </p>
              </div>
            </div>

            {load.first_available_date && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                First Available: {new Date(load.first_available_date as string).toLocaleDateString()}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Size & Pricing */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-500" />
              Size & Pricing
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {load.estimated_cuft && (
                <div>
                  <p className="text-xs text-muted-foreground">Cubic Feet</p>
                  <p className="font-medium">{load.estimated_cuft} CUFT</p>
                </div>
              )}
              {load.estimated_weight_lbs && (
                <div>
                  <p className="text-xs text-muted-foreground">Weight</p>
                  <p className="font-medium">{load.estimated_weight_lbs?.toLocaleString()} lbs</p>
                </div>
              )}
              <div>
                <p className="text-xs text-muted-foreground">Revenue</p>
                <p className="font-medium text-green-500">
                  ${(load.total_revenue as number || 0).toLocaleString()}
                </p>
              </div>
              {carrier && load.carrier_rate && (
                <div>
                  <p className="text-xs text-muted-foreground">Carrier Pay</p>
                  <p className="font-medium">
                    ${(load.carrier_rate as number).toLocaleString()}
                  </p>
                </div>
              )}
            </div>

            {load.pricing_mode && (
              <p className="text-xs text-muted-foreground mt-2">
                Pricing: {load.pricing_mode === 'cuft' ? 'Per Cubic Foot' : 'Per Hundredweight (CWT)'}
                {load.rate_per_cuft && ` @ $${load.rate_per_cuft}/cuft`}
                {load.rate_per_cwt && ` @ $${load.rate_per_cwt}/cwt`}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Carrier Assignment */}
        <Card className={!carrier ? 'border-yellow-500/30' : ''}>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Truck className="h-5 w-5" />
              Carrier
            </CardTitle>
            {!carrier && (
              <CardDescription className="flex items-center gap-1 text-yellow-500">
                <AlertCircle className="h-4 w-4" />
                No carrier assigned
              </CardDescription>
            )}
          </CardHeader>
          <CardContent>
            {carrier ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div>
                    <p className="font-medium">{carrier.name}</p>
                    {carrier.mc_number && (
                      <p className="text-sm text-muted-foreground">MC# {carrier.mc_number}</p>
                    )}
                  </div>
                  {load.carrier_assigned_at && (
                    <p className="text-xs text-muted-foreground">
                      Assigned {new Date(load.carrier_assigned_at as string).toLocaleDateString()}
                    </p>
                  )}
                </div>

                {/* Expected Load Date & Driver Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 border rounded-lg">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                      <Calendar className="h-4 w-4" />
                      <span>Expected Load Date</span>
                    </div>
                    {load.expected_load_date ? (
                      <p className="font-medium">
                        {new Date(load.expected_load_date as string).toLocaleDateString()}
                      </p>
                    ) : (
                      <p className="text-muted-foreground">
                        {load.carrier_confirmed_at ? 'Not set' : 'Awaiting confirmation'}
                      </p>
                    )}
                  </div>

                  <div className="p-3 border rounded-lg">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                      <User className="h-4 w-4" />
                      <span>Assigned Driver</span>
                    </div>
                    {load.assigned_driver_id && !load.assigned_driver_name ? (
                      <p className="text-muted-foreground">Contact carrier</p>
                    ) : load.assigned_driver_name ? (
                      <div>
                        <p className="font-medium">{load.assigned_driver_name}</p>
                        {load.assigned_driver_phone && (
                          <a
                            href={`tel:${load.assigned_driver_phone}`}
                            className="flex items-center gap-1 text-sm text-blue-500 hover:underline"
                          >
                            <Phone className="h-3 w-3" />
                            {load.assigned_driver_phone}
                          </a>
                        )}
                      </div>
                    ) : (
                      <p className="text-yellow-500 font-medium">TBD</p>
                    )}
                  </div>
                </div>

                {/* Confirmation Status */}
                {!load.carrier_confirmed_at && (
                  <div className="flex items-center gap-2 p-3 bg-yellow-500/10 rounded-lg">
                    <Clock className="h-4 w-4 text-yellow-500" />
                    <span className="text-sm text-yellow-600">
                      Carrier has not yet confirmed this load
                    </span>
                  </div>
                )}

                {canUnassign && (
                  <form action={unassignCarrierAction}>
                    <input type="hidden" name="load_id" value={id} />
                    <Button type="submit" variant="outline" size="sm" className="text-red-500">
                      Remove Carrier Assignment
                    </Button>
                  </form>
                )}

                {/* Cancel Carrier form - for confirmed loads */}
                {canCancelCarrier && (
                  <div className="mt-4 pt-4 border-t">
                    <p className="text-sm font-medium mb-3 flex items-center gap-2">
                      <XCircle className="h-4 w-4 text-red-500" />
                      Cancel Carrier Assignment
                    </p>
                    <form action={cancelCarrierAction} className="space-y-3">
                      <input type="hidden" name="load_id" value={id} />
                      <select
                        name="reason_code"
                        className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                        required
                      >
                        <option value="">Select reason...</option>
                        {cancelReasonOptions.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          name="repost_to_marketplace"
                          value="true"
                          defaultChecked
                          className="rounded border-input"
                        />
                        <span>Repost to marketplace after canceling</span>
                      </label>
                      <Button
                        type="submit"
                        variant="destructive"
                        size="sm"
                        className="w-full"
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        Cancel Carrier
                      </Button>
                    </form>
                  </div>
                )}
              </div>
            ) : canAssignCarrier ? (
              <form action={assignCarrierAction} className="space-y-4">
                <input type="hidden" name="load_id" value={id} />

                <div>
                  <Label htmlFor="carrier_id">Select Carrier</Label>
                  <Select name="carrier_id">
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a carrier partner..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No carrier</SelectItem>
                      {carrierPartners.map((p) => (
                        <SelectItem key={p.partner?.id || p.id} value={p.partner?.id || ''}>
                          {p.partner?.name}
                          {p.partner?.mc_number && ` (MC# ${p.partner.mc_number})`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {carrierPartners.length === 0 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      No carrier partners available.{' '}
                      <Link href="/company/carriers" className="text-primary underline">
                        Add carriers
                      </Link>
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="carrier_rate">Carrier Rate ($)</Label>
                    <Input
                      id="carrier_rate"
                      name="carrier_rate"
                      type="number"
                      step="0.01"
                      placeholder="1500.00"
                    />
                  </div>
                  <div>
                    <Label htmlFor="carrier_rate_type">Rate Type</Label>
                    <Select name="carrier_rate_type" defaultValue="flat">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="flat">Flat Rate</SelectItem>
                        <SelectItem value="per_cuft">Per CUFT</SelectItem>
                        <SelectItem value="per_cwt">Per CWT</SelectItem>
                        <SelectItem value="percentage">Percentage</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Button type="submit" disabled={carrierPartners.length === 0}>
                  Assign Carrier
                </Button>
              </form>
            ) : (
              <p className="text-sm text-muted-foreground">
                Carrier assignment cannot be changed at this stage.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Carrier Requests - Show when on marketplace and not assigned */}
        {load.is_marketplace_visible && !load.assigned_carrier_id && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="h-5 w-5" />
                Carrier Requests
              </CardTitle>
              <CardDescription>
                View and respond to carrier requests for this load
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild className="w-full">
                <Link href={`/company/loads/${id}/requests`}>
                  View Requests
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Loading Photos - Show when carrier has uploaded loading photos */}
        {loadingPhotos.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Camera className="h-5 w-5" />
                Loading Photos
                <Badge variant="outline">{loadingPhotos.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <PhotoGallery photos={loadingPhotos} />
            </CardContent>
          </Card>
        )}

        {/* Delivery Proof - Only show for delivered loads */}
        {load.load_status === 'delivered' && (
          <Card className="border-green-500/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                Delivery Proof
              </CardTitle>
              {load.delivered_at && (
                <CardDescription>
                  Delivered {new Date(load.delivered_at as string).toLocaleString()}
                </CardDescription>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Signature */}
              {load.delivery_signature_url ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <FileSignature className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Signature</span>
                  </div>
                  <div className="border rounded-lg p-2 bg-white">
                    <Image
                      src={load.delivery_signature_url as string}
                      alt="Delivery signature"
                      width={300}
                      height={100}
                      className="w-full max-w-[300px] h-auto"
                    />
                  </div>
                  {load.delivery_signed_by && (
                    <p className="text-sm text-muted-foreground">
                      Signed by: {load.delivery_signed_by}
                    </p>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <FileSignature className="h-4 w-4" />
                  <span className="text-sm">No signature captured</span>
                </div>
              )}

              {/* Delivery Photos */}
              {deliveryPhotos.length > 0 ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Camera className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">
                      Delivery Photos ({deliveryPhotos.length})
                    </span>
                  </div>
                  <PhotoGallery photos={deliveryPhotos} />
                </div>
              ) : (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Camera className="h-4 w-4" />
                  <span className="text-sm">No delivery photos</span>
                </div>
              )}

              {/* Delivery Notes */}
              {load.delivery_notes && (
                <div className="space-y-1">
                  <p className="text-sm font-medium">Delivery Notes</p>
                  <p className="text-sm text-muted-foreground">{load.delivery_notes}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Rate Carrier - Only show for delivered loads with carrier */}
        {load.load_status === 'delivered' && carrier && (
          existingRating ? (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Star className="h-5 w-5 text-yellow-400" />
                  Your Rating for {carrier.name}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  <RatingStars rating={existingRating.rating} size="lg" showValue />
                </div>
                {existingRating.comment && (
                  <p className="text-sm text-muted-foreground mt-2">{existingRating.comment}</p>
                )}
                <p className="text-xs text-muted-foreground mt-2">
                  Rated on {new Date(existingRating.created_at).toLocaleDateString()}
                </p>
              </CardContent>
            </Card>
          ) : (
            <RatingForm
              loadId={id}
              raterCompanyId={session.company_id}
              ratedCompanyId={carrier.id}
              ratedCompanyName={carrier.name}
              raterType="shipper"
              onSubmit={submitRatingAction}
            />
          )
        )}

        {/* Notes */}
        {load.special_instructions && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm">{load.special_instructions}</p>
            </CardContent>
          </Card>
        )}

        {/* Load Status Timeline */}
        {load.assigned_carrier_id && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Status Timeline
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  { status: 'accepted', label: 'Carrier Confirmed', timestamp: load.carrier_confirmed_at, icon: CheckCircle },
                  { status: 'loading', label: 'Loading Started', timestamp: load.loading_started_at, icon: Package },
                  { status: 'loaded', label: 'Loaded on Truck', timestamp: load.loaded_at, icon: Truck },
                  { status: 'in_transit', label: 'In Transit', timestamp: load.in_transit_at, icon: Navigation },
                  { status: 'delivered', label: 'Delivered', timestamp: load.delivered_at, icon: CheckCircle },
                ].map((step) => {
                  const isCompleted = getStatusOrder(load.load_status as string) >= getStatusOrder(step.status);
                  const isCurrent = load.load_status === step.status;
                  const StepIcon = step.icon;

                  return (
                    <div key={step.status} className="flex items-center gap-3">
                      <div
                        className={`
                        h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0
                        ${isCompleted ? 'bg-green-500 text-white' : 'bg-muted text-muted-foreground'}
                        ${isCurrent ? 'ring-2 ring-green-500 ring-offset-2' : ''}
                      `}
                      >
                        <StepIcon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 flex items-center justify-between">
                        <p className={`${isCompleted ? 'font-medium' : 'text-muted-foreground'}`}>
                          {step.label}
                        </p>
                        {step.timestamp && (
                          <p className="text-xs text-muted-foreground">
                            {new Date(step.timestamp as string).toLocaleString()}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {load.load_status === 'delivered' && (
                <div className="mt-4 p-3 bg-green-500/10 rounded-lg text-center">
                  <CheckCircle className="h-6 w-6 mx-auto text-green-500 mb-1" />
                  <p className="font-medium text-green-600">Delivered Successfully</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Activity Log */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="h-5 w-5 text-muted-foreground" />
              Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Created</span>
                <span>{new Date(load.created_at as string).toLocaleString()}</span>
              </div>
              {load.carrier_assigned_at && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Carrier Assigned</span>
                  <span>
                    {new Date(load.carrier_assigned_at as string).toLocaleString()}
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
