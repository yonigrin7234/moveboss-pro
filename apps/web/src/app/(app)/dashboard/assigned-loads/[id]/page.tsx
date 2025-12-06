import { redirect, notFound } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { getCurrentUser } from '@/lib/supabase-server';
import { getAssignedLoadDetails, updateLoadDriver, assignLoadToTrip } from '@/data/marketplace';
import { getDriversForUser } from '@/data/drivers';
import { getTripsForLoadAssignment } from '@/data/trips';
import { updateLoadStatus, getLoadStatusHistory } from '@/data/load-status';
import { getRatingForLoad, submitRating } from '@/data/ratings';
import { getWorkspaceCompanyForUser } from '@/data/companies';
import { getLoadPhotos, uploadLoadPhoto } from '@/data/load-photos';
import { RatingForm } from '@/components/rating-form';
import { RatingStars } from '@/components/rating-stars';
import { PhotoGallery } from '@/components/photo-gallery';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import Link from 'next/link';
import {
  ArrowLeft,
  ArrowRight,
  Package,
  Calendar,
  User,
  Phone,
  Mail,
  MapPin,
  Building2,
  DollarSign,
  Clock,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  Navigation,
  Key,
  FileText,
  Truck,
  Star,
  Camera,
  Route,
} from 'lucide-react';
import { MarketplaceActions } from '@/components/marketplace/marketplace-actions';
import { TripAssignmentForm } from '@/components/trip-assignment-form';

interface PageProps {
  params: Promise<{ id: string }>;
}

const statusConfig: Record<string, { label: string; color: string }> = {
  accepted: { label: 'Ready to Load', color: 'bg-blue-500/20 text-blue-400' },
  loading: { label: 'Loading', color: 'bg-yellow-500/20 text-yellow-400' },
  loaded: { label: 'Loaded', color: 'bg-orange-500/20 text-orange-400' },
  in_transit: { label: 'In Transit', color: 'bg-purple-500/20 text-purple-400' },
  delivered: { label: 'Delivered', color: 'bg-green-500/20 text-green-400' },
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

export default async function AssignedLoadDetailPage({ params }: PageProps) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const load = await getAssignedLoadDetails(id, user.id);

  if (!load) {
    notFound();
  }

  // If not confirmed yet, redirect to confirm page
  if (!load.carrier_confirmed_at) {
    redirect(`/dashboard/assigned-loads/${id}/confirm`);
  }

  // Get carrier's drivers for assignment, status history, company info, existing rating, photos, and trips
  const carrierCompany = await getWorkspaceCompanyForUser(user.id);
  const [drivers, statusHistory, existingRating, photos, availableTrips] = await Promise.all([
    getDriversForUser(user.id),
    getLoadStatusHistory(id),
    carrierCompany ? getRatingForLoad(id, carrierCompany.id) : Promise.resolve(null),
    getLoadPhotos(id),
    getTripsForLoadAssignment(user.id),
  ]);

  // Filter photos by type
  const loadingPhotos = photos.filter(
    (p) => p.photo_type === 'loading' || p.photo_type === 'loaded'
  );
  const deliveryPhotos = photos.filter((p) => p.photo_type === 'delivery');

  async function updateDriverAction(formData: FormData) {
    'use server';

    const currentUser = await getCurrentUser();
    if (!currentUser) redirect('/login');

    const driverType = formData.get('driver_type') as string;

    let driverName: string = '';
    let driverPhone: string = '';
    let driverId: string | undefined;

    if (driverType === 'existing') {
      driverId = formData.get('driver_id') as string;
      if (driverId && driverId !== 'none') {
        const { createClient } = await import('@/lib/supabase-server');
        const supabase = await createClient();
        const { data: driver } = await supabase
          .from('drivers')
          .select('id, first_name, last_name, phone')
          .eq('id', driverId)
          .single();

        if (driver) {
          driverName = `${driver.first_name} ${driver.last_name}`;
          driverPhone = driver.phone || '';
        }
      }
    } else if (driverType === 'manual') {
      driverName = (formData.get('driver_name') as string) || '';
      driverPhone = (formData.get('driver_phone') as string) || '';
    }

    if (!driverName) {
      return; // No driver info provided
    }

    const result = await updateLoadDriver(id, {
      assigned_driver_id: driverId,
      assigned_driver_name: driverName,
      assigned_driver_phone: driverPhone,
    });

    if (result.success) {
      revalidatePath(`/dashboard/assigned-loads/${id}`);
    }
  }

  async function updateStatusAction(formData: FormData) {
    'use server';

    const currentUser = await getCurrentUser();
    if (!currentUser) redirect('/login');

    const loadId = formData.get('load_id') as string;
    const newStatus = formData.get('new_status') as string;
    const notes = formData.get('notes') as string;

    await updateLoadStatus(loadId, newStatus as 'loading' | 'loaded' | 'in_transit' | 'delivered', currentUser.id, {
      notes: notes || undefined,
    });

    revalidatePath(`/dashboard/assigned-loads/${loadId}`);
    revalidatePath('/dashboard/assigned-loads');
  }

  async function uploadPhotoAction(formData: FormData) {
    'use server';

    const currentUser = await getCurrentUser();
    if (!currentUser) redirect('/login');

    const loadId = formData.get('load_id') as string;
    const photoType = formData.get('photo_type') as 'loading' | 'loaded' | 'delivery' | 'damage' | 'other';
    const photo = formData.get('photo') as File;
    const caption = formData.get('caption') as string;

    if (!photo || photo.size === 0) {
      return;
    }

    await uploadLoadPhoto(loadId, currentUser.id, null, photoType, photo, {
      caption: caption || undefined,
    });

    revalidatePath(`/dashboard/assigned-loads/${loadId}`);
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

    revalidatePath(`/dashboard/assigned-loads/${loadId}`);
  }

  async function assignToTripAction(loadId: string, tripId: string): Promise<{ success: boolean; error?: string }> {
    'use server';

    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return { success: false, error: 'Not authenticated' };
    }

    console.log('assignToTripAction: Called with', { loadId, tripId, userId: currentUser.id });

    if (!tripId) {
      console.error('assignToTripAction: No tripId provided');
      return { success: false, error: 'No trip selected' };
    }

    const result = await assignLoadToTrip(loadId, tripId, 1);
    console.log('assignToTripAction: Result', result);

    if (result.success) {
      revalidatePath(`/dashboard/assigned-loads/${loadId}`);
      revalidatePath('/dashboard/assigned-loads');
      revalidatePath(`/dashboard/trips/${tripId}`);
    } else {
      console.error('assignToTripAction: Failed', result.error);
    }

    return result;
  }

  const company = Array.isArray(load.company) ? load.company[0] : load.company;
  const totalValue =
    load.carrier_rate && load.estimated_cuft
      ? load.carrier_rate * load.estimated_cuft
      : null;
  const status = statusConfig[load.load_status] || statusConfig.accepted;
  const hasDriver = !!load.assigned_driver_name;

  // Build Google Maps URL for pickup navigation
  const pickupAddress = [
    load.origin_address,
    load.origin_city,
    load.origin_state,
    load.origin_zip,
  ]
    .filter(Boolean)
    .join(', ');
  const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(pickupAddress)}`;

  return (
    <div className="container py-6 max-w-2xl space-y-6">
      {/* Back Button */}
      <Button variant="ghost" size="sm" asChild>
        <Link href="/dashboard/assigned-loads">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Assigned Loads
        </Link>
      </Button>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <Building2 className="h-4 w-4" />
            <span>{company?.name}</span>
          </div>
          <h1 className="text-2xl font-bold">{load.load_number}</h1>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={status.color}>{status.label}</Badge>
        </div>
      </div>

      {/* Warning: Load not on a trip - drivers can't see it on mobile */}
      {!load.trip_id && load.load_status !== 'delivered' && (
        <Card className="border-orange-500/50 bg-orange-500/10">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-orange-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium text-orange-700 dark:text-orange-400">
                  Not assigned to a trip
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Drivers cannot see this load on the mobile app until it&apos;s added to a trip.
                  Scroll down to assign this load to an existing trip or create a new one.
                </p>
              </div>
              <a href="#trip-assignment" className="text-sm text-orange-600 hover:underline whitespace-nowrap">
                Assign Trip →
              </a>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Release Load Action - only show if load is accepted (not yet in progress) */}
      {carrierCompany && load.posting_status === 'assigned' && load.load_status === 'accepted' && (
        <Card className="border-yellow-500/30 bg-yellow-500/5">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="font-medium">Can&apos;t complete this load?</p>
              <p className="text-sm text-muted-foreground">Release it back to the marketplace for other carriers</p>
            </div>
            <MarketplaceActions
              loadId={load.id}
              postingStatus={load.posting_status}
              carrierId={carrierCompany.id}
            />
          </CardContent>
        </Card>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <Package className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
            <p className="text-lg font-bold">{load.estimated_cuft}</p>
            <p className="text-xs text-muted-foreground">CUFT</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <DollarSign className="h-5 w-5 mx-auto mb-1 text-green-500" />
            <p className="text-lg font-bold text-green-500">
              ${load.carrier_rate?.toFixed(2)}
            </p>
            <p className="text-xs text-muted-foreground">per CF</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Calendar className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
            <p className="text-lg font-bold">
              {load.expected_load_date
                ? new Date(load.expected_load_date).toLocaleDateString()
                : 'TBD'}
            </p>
            <p className="text-xs text-muted-foreground">Load Date</p>
          </CardContent>
        </Card>
      </div>

      {totalValue && (
        <Card className="border-green-500/30 bg-green-500/5">
          <CardContent className="p-4 text-center">
            <p className="text-sm text-muted-foreground">Total Value</p>
            <p className="text-2xl font-bold text-green-500">
              ${totalValue.toLocaleString()}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Pickup Location - REVEALED */}
      <Card className="border-blue-500/30">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <MapPin className="h-5 w-5 text-blue-500" />
              Pickup Location
            </CardTitle>
            <Button size="sm" asChild>
              <a href={mapsUrl} target="_blank" rel="noopener noreferrer">
                <Navigation className="h-4 w-4 mr-2" />
                Navigate
              </a>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <p className="font-semibold text-lg">
              {load.origin_address}
              {load.origin_address2 && `, ${load.origin_address2}`}
            </p>
            <p className="text-muted-foreground">
              {load.origin_city}, {load.origin_state} {load.origin_zip}
            </p>
          </div>

          {(load.origin_contact_name || load.origin_contact_phone) && (
            <div className="flex flex-wrap gap-4 pt-2">
              {load.origin_contact_name && (
                <div className="flex items-center gap-2 text-sm">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span>{load.origin_contact_name}</span>
                </div>
              )}
              {load.origin_contact_phone && (
                <a
                  href={`tel:${load.origin_contact_phone}`}
                  className="flex items-center gap-2 text-sm text-blue-500 hover:underline"
                >
                  <Phone className="h-4 w-4" />
                  <span>{load.origin_contact_phone}</span>
                </a>
              )}
              {load.origin_contact_email && (
                <a
                  href={`mailto:${load.origin_contact_email}`}
                  className="flex items-center gap-2 text-sm text-blue-500 hover:underline"
                >
                  <Mail className="h-4 w-4" />
                  <span>{load.origin_contact_email}</span>
                </a>
              )}
            </div>
          )}

          {load.origin_gate_code && (
            <div className="flex items-center gap-2 p-2 bg-muted rounded">
              <Key className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">
                Gate Code: <strong>{load.origin_gate_code}</strong>
              </span>
            </div>
          )}

          {load.origin_notes && (
            <div className="p-2 bg-muted/50 rounded text-sm">
              <p className="text-muted-foreground">{load.origin_notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Destination */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <ArrowRight className="h-5 w-5 text-green-500" />
            Delivery Location
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            {load.destination_address && (
              <p className="font-semibold text-lg">
                {load.destination_address}
                {load.destination_address2 && `, ${load.destination_address2}`}
              </p>
            )}
            <p className={load.destination_address ? 'text-muted-foreground' : 'font-semibold text-lg'}>
              {load.destination_city}, {load.destination_state} {load.destination_zip}
            </p>
          </div>

          {(load.destination_contact_name || load.destination_contact_phone) && (
            <div className="flex flex-wrap gap-4 pt-2">
              {load.destination_contact_name && (
                <div className="flex items-center gap-2 text-sm">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span>{load.destination_contact_name}</span>
                </div>
              )}
              {load.destination_contact_phone && (
                <a
                  href={`tel:${load.destination_contact_phone}`}
                  className="flex items-center gap-2 text-sm text-blue-500 hover:underline"
                >
                  <Phone className="h-4 w-4" />
                  <span>{load.destination_contact_phone}</span>
                </a>
              )}
            </div>
          )}

          {load.destination_gate_code && (
            <div className="flex items-center gap-2 p-2 bg-muted rounded">
              <Key className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">
                Gate Code: <strong>{load.destination_gate_code}</strong>
              </span>
            </div>
          )}

          {load.destination_notes && (
            <div className="p-2 bg-muted/50 rounded text-sm">
              <p className="text-muted-foreground">{load.destination_notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Driver Assignment */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Truck className="h-5 w-5" />
            Driver Assignment
          </CardTitle>
          {hasDriver ? (
            <CardDescription className="flex items-center gap-1 text-green-500">
              <CheckCircle className="h-4 w-4" />
              Driver assigned
            </CardDescription>
          ) : (
            <CardDescription className="flex items-center gap-1 text-yellow-500">
              <AlertCircle className="h-4 w-4" />
              No driver assigned yet
            </CardDescription>
          )}
        </CardHeader>
        <CardContent>
          {hasDriver ? (
            <div className="p-4 bg-muted/50 rounded-lg space-y-2">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{load.assigned_driver_name}</span>
              </div>
              {load.assigned_driver_phone && (
                <a
                  href={`tel:${load.assigned_driver_phone}`}
                  className="flex items-center gap-2 text-sm text-blue-500 hover:underline"
                >
                  <Phone className="h-4 w-4" />
                  <span>{load.assigned_driver_phone}</span>
                </a>
              )}
            </div>
          ) : (
            <form action={updateDriverAction} className="space-y-4">
              <RadioGroup
                name="driver_type"
                defaultValue="existing"
                className="space-y-3"
              >
                {/* Select from existing drivers */}
                {drivers.length > 0 && (
                  <div className="flex items-start space-x-3 p-4 border rounded-lg">
                    <RadioGroupItem
                      value="existing"
                      id="driver_existing"
                      className="mt-1"
                    />
                    <div className="flex-1 space-y-3">
                      <Label htmlFor="driver_existing">
                        Select from my drivers
                      </Label>
                      <Select name="driver_id">
                        <SelectTrigger>
                          <SelectValue placeholder="Choose a driver" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No driver selected</SelectItem>
                          {drivers.map((driver) => (
                            <SelectItem key={driver.id} value={driver.id}>
                              {driver.first_name} {driver.last_name}
                              {driver.phone && ` - ${driver.phone}`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}

                {/* Manual entry */}
                <div className="flex items-start space-x-3 p-4 border rounded-lg">
                  <RadioGroupItem
                    value="manual"
                    id="driver_manual"
                    className="mt-1"
                  />
                  <div className="flex-1 space-y-3">
                    <Label htmlFor="driver_manual">
                      Enter driver info manually
                    </Label>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor="driver_name" className="text-sm">
                          Driver Name
                        </Label>
                        <Input
                          id="driver_name"
                          name="driver_name"
                          placeholder="John Smith"
                        />
                      </div>
                      <div>
                        <Label htmlFor="driver_phone" className="text-sm">
                          Driver Phone
                        </Label>
                        <Input
                          id="driver_phone"
                          name="driver_phone"
                          placeholder="555-123-4567"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </RadioGroup>

              <Button type="submit" className="w-full">
                <User className="h-4 w-4 mr-2" />
                Assign Driver
              </Button>
            </form>
          )}
        </CardContent>
      </Card>

      {/* Trip Assignment */}
      <Card id="trip-assignment">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Route className="h-5 w-5" />
            Trip Assignment
          </CardTitle>
          {load.trip_id ? (
            <CardDescription className="flex items-center gap-1 text-green-500">
              <CheckCircle className="h-4 w-4" />
              Assigned to trip
            </CardDescription>
          ) : (
            <CardDescription className="flex items-center gap-1 text-yellow-500">
              <AlertCircle className="h-4 w-4" />
              Not assigned to a trip
            </CardDescription>
          )}
        </CardHeader>
        <CardContent>
          {load.trip_id ? (
            <div className="space-y-3">
              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground">This load is assigned to a trip.</p>
              </div>
              <Button variant="outline" asChild className="w-full">
                <Link href={`/dashboard/trips/${load.trip_id}`}>
                  <Route className="h-4 w-4 mr-2" />
                  View Trip
                </Link>
              </Button>
            </div>
          ) : (
            <TripAssignmentForm
              loadId={id}
              availableTrips={availableTrips.map((trip) => ({
                id: trip.id,
                trip_number: trip.trip_number,
                driver: Array.isArray(trip.driver) ? trip.driver[0] : trip.driver,
              }))}
              assignToTrip={assignToTripAction}
            />
          )}
        </CardContent>
      </Card>

      {/* Load Status Timeline & Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Load Status
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Status Timeline */}
          <div className="space-y-3">
            {[
              { status: 'accepted', label: 'Confirmed', icon: CheckCircle },
              { status: 'loading', label: 'Loading', icon: Package },
              { status: 'loaded', label: 'Loaded', icon: Truck },
              { status: 'in_transit', label: 'In Transit', icon: Navigation },
              { status: 'delivered', label: 'Delivered', icon: CheckCircle },
            ].map((step) => {
              const isCompleted = getStatusOrder(load.load_status) >= getStatusOrder(step.status);
              const isCurrent = load.load_status === step.status;
              const StepIcon = step.icon;
              const historyEntry = statusHistory.find((h) => h.status === step.status);

              return (
                <div key={step.status} className="flex items-center gap-3">
                  <div
                    className={`
                    h-8 w-8 rounded-full flex items-center justify-center
                    ${isCompleted ? 'bg-green-500 text-white' : 'bg-muted text-muted-foreground'}
                    ${isCurrent ? 'ring-2 ring-green-500 ring-offset-2' : ''}
                  `}
                  >
                    <StepIcon className="h-4 w-4" />
                  </div>
                  <div className="flex-1">
                    <p className={`font-medium ${isCompleted ? '' : 'text-muted-foreground'}`}>
                      {step.label}
                    </p>
                    {historyEntry && (
                      <p className="text-xs text-muted-foreground">
                        {new Date(historyEntry.created_at).toLocaleString()}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <Separator />

          {/* Status Update Buttons */}
          {load.load_status !== 'delivered' && (
            <form action={updateStatusAction} className="space-y-3">
              <input type="hidden" name="load_id" value={load.id} />

              {load.load_status === 'accepted' && (
                <>
                  <input type="hidden" name="new_status" value="loading" />
                  <Button type="submit" className="w-full">
                    <Package className="h-4 w-4 mr-2" />
                    Start Loading
                  </Button>
                </>
              )}

              {load.load_status === 'loading' && (
                <>
                  <input type="hidden" name="new_status" value="loaded" />
                  <div>
                    <Label htmlFor="notes">Loading Notes (optional)</Label>
                    <Textarea
                      id="notes"
                      name="notes"
                      placeholder="Number of items, condition, etc."
                      rows={2}
                    />
                  </div>
                  <Button type="submit" className="w-full">
                    <Truck className="h-4 w-4 mr-2" />
                    Mark as Loaded
                  </Button>
                </>
              )}

              {load.load_status === 'loading' && (
                <div className="pt-3 border-t space-y-3">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Camera className="h-4 w-4" />
                    Loading Photos
                    {loadingPhotos.length > 0 && (
                      <span className="text-muted-foreground">({loadingPhotos.length})</span>
                    )}
                  </div>
                  {loadingPhotos.length > 0 && (
                    <PhotoGallery photos={loadingPhotos} canDelete />
                  )}
                  <form action={uploadPhotoAction} className="space-y-2">
                    <input type="hidden" name="load_id" value={load.id} />
                    <input type="hidden" name="photo_type" value="loading" />
                    <Input type="file" name="photo" accept="image/*" capture="environment" />
                    <Input name="caption" placeholder="Caption (optional)" />
                    <Button type="submit" variant="outline" size="sm" className="w-full">
                      <Camera className="h-4 w-4 mr-2" />
                      Upload Loading Photo
                    </Button>
                  </form>
                </div>
              )}

              {load.load_status === 'loaded' && (
                <>
                  <input type="hidden" name="new_status" value="in_transit" />
                  <Button type="submit" className="w-full">
                    <Navigation className="h-4 w-4 mr-2" />
                    Start Transit
                  </Button>
                </>
              )}

              {load.load_status === 'in_transit' && (
                <>
                  <input type="hidden" name="new_status" value="delivered" />
                  <div>
                    <Label htmlFor="notes">Delivery Notes (optional)</Label>
                    <Textarea
                      id="notes"
                      name="notes"
                      placeholder="Delivery details, who received, etc."
                      rows={2}
                    />
                  </div>
                  <Button type="submit" className="w-full bg-green-600 hover:bg-green-700">
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Mark as Delivered
                  </Button>
                </>
              )}

              {load.load_status === 'in_transit' && (
                <div className="pt-3 border-t space-y-3">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Camera className="h-4 w-4" />
                    Delivery Photos
                    {deliveryPhotos.length > 0 && (
                      <span className="text-muted-foreground">({deliveryPhotos.length})</span>
                    )}
                  </div>
                  {deliveryPhotos.length > 0 && (
                    <PhotoGallery photos={deliveryPhotos} canDelete />
                  )}
                  <form action={uploadPhotoAction} className="space-y-2">
                    <input type="hidden" name="load_id" value={load.id} />
                    <input type="hidden" name="photo_type" value="delivery" />
                    <Input type="file" name="photo" accept="image/*" capture="environment" />
                    <Input name="caption" placeholder="Caption (optional)" />
                    <Button type="submit" variant="outline" size="sm" className="w-full">
                      <Camera className="h-4 w-4 mr-2" />
                      Upload Delivery Photo
                    </Button>
                  </form>
                </div>
              )}
            </form>
          )}

          {load.load_status === 'delivered' && (
            <div className="p-4 bg-green-500/10 rounded-lg text-center">
              <CheckCircle className="h-8 w-8 mx-auto text-green-500 mb-2" />
              <p className="font-medium text-green-600">Load Delivered!</p>
              {load.delivered_at && (
                <p className="text-sm text-muted-foreground">
                  {new Date(load.delivered_at).toLocaleString()}
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Rate Company - Only show for delivered loads */}
      {load.load_status === 'delivered' && company && carrierCompany && (
        existingRating ? (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Star className="h-5 w-5 text-yellow-400" />
                Your Rating for {company.name}
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
            raterCompanyId={carrierCompany.id}
            ratedCompanyId={company.id}
            ratedCompanyName={company.name}
            raterType="carrier"
            onSubmit={submitRatingAction}
          />
        )
      )}

      {/* Special Instructions */}
      {load.special_instructions && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Special Instructions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {load.special_instructions}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Company Contact */}
      {company?.phone && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Building2 className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">{company.name}</p>
                  <p className="text-sm text-muted-foreground">
                    Contact for questions
                  </p>
                </div>
              </div>
              <Button variant="outline" size="sm" asChild>
                <a href={`tel:${company.phone}`}>
                  <Phone className="h-4 w-4 mr-2" />
                  Call
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
