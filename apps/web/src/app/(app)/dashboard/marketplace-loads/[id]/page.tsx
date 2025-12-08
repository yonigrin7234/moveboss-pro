import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { revalidatePath } from 'next/cache';
import { getCurrentUser } from '@/lib/supabase-server';
import { getCarrierMarketplaceLoadDetail, assignLoadToTrip, updateLoadOperationalStatus } from '@/data/marketplace';
import { getTripsForLoadAssignment } from '@/data/trips';
import { getWorkspaceCompanyForUser } from '@/data/companies';
import { LoadConversationPanel } from '@/components/messaging/LoadConversationPanel';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import {
  ArrowLeft,
  ArrowRight,
  MapPin,
  Package,
  Building2,
  Calendar,
  DollarSign,
  Truck,
  Phone,
  Mail,
  User,
  Clock,
  CheckCircle,
  Route,
  FileText,
} from 'lucide-react';
import { TripAssignmentForm } from '@/components/trip-assignment-form';

function formatDateRange(start: string | null, end: string | null): string {
  if (!start) return 'TBD';
  const startDate = new Date(start);
  const startStr = startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  if (!end || end === start) return startStr;

  const endDate = new Date(end);
  const endStr = endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return `${startStr} - ${endStr}`;
}

function formatRate(rate: number | null, rateType: string, cuft: number | null): string {
  if (!rate) return 'TBD';
  const total = cuft ? rate * cuft : null;
  if (rateType === 'per_cuft') {
    return total ? `$${rate.toFixed(2)}/cf ($${total.toLocaleString()})` : `$${rate.toFixed(2)}/cf`;
  }
  return `$${rate.toLocaleString()}`;
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'unassigned':
      return <Badge className="bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 border-0">Unassigned</Badge>;
    case 'assigned_to_driver':
      return <Badge className="bg-blue-500/20 text-blue-600 dark:text-blue-400 border-0">Assigned to Driver</Badge>;
    case 'en_route_to_pickup':
      return <Badge className="bg-purple-500/20 text-purple-600 dark:text-purple-400 border-0">En Route to Pickup</Badge>;
    case 'at_pickup':
      return <Badge className="bg-purple-500/20 text-purple-600 dark:text-purple-400 border-0">At Pickup</Badge>;
    case 'loading':
      return <Badge className="bg-purple-500/20 text-purple-600 dark:text-purple-400 border-0">Loading</Badge>;
    case 'loaded':
      return <Badge className="bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border-0">Loaded</Badge>;
    case 'in_transit':
      return <Badge className="bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border-0">In Transit</Badge>;
    case 'at_delivery':
      return <Badge className="bg-green-500/20 text-green-600 dark:text-green-400 border-0">At Delivery</Badge>;
    case 'delivered':
      return <Badge className="bg-green-500/20 text-green-600 dark:text-green-400 border-0">Delivered</Badge>;
    case 'completed':
      return <Badge className="bg-gray-500/20 text-gray-600 dark:text-gray-400 border-0">Completed</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

const STATUS_OPTIONS = [
  { value: 'unassigned', label: 'Unassigned' },
  { value: 'assigned_to_driver', label: 'Assigned to Driver' },
  { value: 'en_route_to_pickup', label: 'En Route to Pickup' },
  { value: 'at_pickup', label: 'At Pickup' },
  { value: 'loading', label: 'Loading' },
  { value: 'loaded', label: 'Loaded' },
  { value: 'in_transit', label: 'In Transit' },
  { value: 'at_delivery', label: 'At Delivery' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'completed', label: 'Completed' },
];

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function MarketplaceLoadDetailPage({ params }: PageProps) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const [load, availableTrips, workspaceCompany] = await Promise.all([
    getCarrierMarketplaceLoadDetail(id, user.id),
    getTripsForLoadAssignment(user.id),
    getWorkspaceCompanyForUser(user.id),
  ]);

  if (!load) {
    notFound();
  }

  // Server action to assign load to trip
  async function assignToTripAction(loadId: string, tripId: string): Promise<{ success: boolean; error?: string }> {
    'use server';

    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    if (!tripId) {
      return { success: false, error: 'No trip selected' };
    }

    // Get load order (count of loads in trip + 1)
    const result = await assignLoadToTrip(loadId, tripId, 1);

    if (result.success) {
      revalidatePath(`/dashboard/marketplace-loads/${loadId}`);
      revalidatePath('/dashboard/marketplace-loads');
      revalidatePath(`/dashboard/trips/${tripId}`);
    }

    return result;
  }

  // Server action to update status
  async function updateStatusAction(formData: FormData) {
    'use server';

    const user = await getCurrentUser();
    if (!user) redirect('/login');

    const newStatus = formData.get('status') as string;
    if (!newStatus) return;

    const result = await updateLoadOperationalStatus(id, user.id, newStatus);

    if (result.success) {
      revalidatePath(`/dashboard/marketplace-loads/${id}`);
      revalidatePath('/dashboard/marketplace-loads');
    }
  }

  const isPickup = load.posting_type === 'pickup';

  return (
    <div className="space-y-6">
      {/* Back Link */}
      <Link
        href="/dashboard/marketplace-loads"
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4 mr-1" />
        Back to Marketplace Loads
      </Link>

      {/* Load Header */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border-0">
              FROM MARKETPLACE
            </Badge>
            {isPickup ? (
              <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400 border-0">
                PICKUP
              </Badge>
            ) : load.load_subtype === 'rfd' ? (
              <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400 border-0">
                RFD
              </Badge>
            ) : (
              <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border-0">
                LIVE LOAD
              </Badge>
            )}
            {getStatusBadge(load.operational_status)}
          </div>
          <div className="flex items-center gap-2 text-2xl font-bold mb-1">
            <MapPin className="h-5 w-5" />
            <span>{load.origin_city}, {load.origin_state}</span>
            <ArrowRight className="h-5 w-5 text-muted-foreground" />
            <span>{load.destination_city}, {load.destination_state}</span>
          </div>
          <p className="text-muted-foreground">
            Load #{load.load_number}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Source Company */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Source Company
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-lg font-semibold">{load.source_company_name}</p>
              {load.source_company?.city && load.source_company?.state && (
                <p className="text-muted-foreground">
                  {load.source_company.city}, {load.source_company.state}
                </p>
              )}
              {load.source_company?.phone && (
                <p className="text-sm text-muted-foreground mt-2 flex items-center gap-1">
                  <Phone className="h-4 w-4" />
                  {load.source_company.phone}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Load Details */}
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
                  <p className="text-sm text-muted-foreground">Size</p>
                  <p className="font-medium">{load.estimated_cuft?.toLocaleString() || '?'} cuft</p>
                </div>
                {load.estimated_weight_lbs && (
                  <div>
                    <p className="text-sm text-muted-foreground">Weight</p>
                    <p className="font-medium">{load.estimated_weight_lbs.toLocaleString()} lbs</p>
                  </div>
                )}
                {load.pieces_count && (
                  <div>
                    <p className="text-sm text-muted-foreground">Pieces</p>
                    <p className="font-medium">{load.pieces_count}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-muted-foreground">Rate</p>
                  <p className="font-medium text-green-600 dark:text-green-400">
                    {formatRate(load.carrier_rate, load.carrier_rate_type, load.estimated_cuft)}
                  </p>
                </div>
              </div>

              {isPickup && load.balance_due && (
                <div className="pt-2 border-t">
                  <p className="text-sm text-muted-foreground">Balance Due on Pickup</p>
                  <p className="font-medium text-lg">${load.balance_due.toLocaleString()}</p>
                </div>
              )}

              {load.special_instructions && (
                <div className="pt-2 border-t">
                  <p className="text-sm text-muted-foreground mb-1 flex items-center gap-1">
                    <FileText className="h-4 w-4" />
                    Special Instructions
                  </p>
                  <p className="text-sm bg-muted/50 p-3 rounded-lg">{load.special_instructions}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Dates */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Scheduled Dates
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Load Date</p>
                  <p className="font-medium">
                    {formatDateRange(load.proposed_load_date_start, load.proposed_load_date_end)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Delivery Date</p>
                  <p className="font-medium">
                    {formatDateRange(load.proposed_delivery_date_start, load.proposed_delivery_date_end)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Origin Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-green-500" />
                Origin
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="font-medium">{load.origin_city}, {load.origin_state} {load.origin_zip}</p>
                {load.origin_address && (
                  <p className="text-sm text-muted-foreground">{load.origin_address}</p>
                )}
                {load.origin_address2 && (
                  <p className="text-sm text-muted-foreground">{load.origin_address2}</p>
                )}
              </div>

              {(load.origin_contact_name || load.origin_contact_phone || load.origin_contact_email) && (
                <div className="pt-2 border-t">
                  <p className="text-sm font-medium mb-2">Contact</p>
                  {load.origin_contact_name && (
                    <p className="text-sm flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      {load.origin_contact_name}
                    </p>
                  )}
                  {load.origin_contact_phone && (
                    <p className="text-sm flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <a href={`tel:${load.origin_contact_phone}`} className="text-blue-600 hover:underline">
                        {load.origin_contact_phone}
                      </a>
                    </p>
                  )}
                  {load.origin_contact_email && (
                    <p className="text-sm flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <a href={`mailto:${load.origin_contact_email}`} className="text-blue-600 hover:underline">
                        {load.origin_contact_email}
                      </a>
                    </p>
                  )}
                </div>
              )}

              {load.origin_notes && (
                <div className="pt-2 border-t">
                  <p className="text-sm text-muted-foreground">Notes</p>
                  <p className="text-sm">{load.origin_notes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Destination Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-red-500" />
                Destination
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="font-medium">{load.destination_city}, {load.destination_state} {load.destination_zip}</p>
                {load.destination_address && (
                  <p className="text-sm text-muted-foreground">{load.destination_address}</p>
                )}
                {load.destination_address2 && (
                  <p className="text-sm text-muted-foreground">{load.destination_address2}</p>
                )}
              </div>

              {(load.destination_contact_name || load.destination_contact_phone || load.destination_contact_email) && (
                <div className="pt-2 border-t">
                  <p className="text-sm font-medium mb-2">Contact</p>
                  {load.destination_contact_name && (
                    <p className="text-sm flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      {load.destination_contact_name}
                    </p>
                  )}
                  {load.destination_contact_phone && (
                    <p className="text-sm flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <a href={`tel:${load.destination_contact_phone}`} className="text-blue-600 hover:underline">
                        {load.destination_contact_phone}
                      </a>
                    </p>
                  )}
                  {load.destination_contact_email && (
                    <p className="text-sm flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <a href={`mailto:${load.destination_contact_email}`} className="text-blue-600 hover:underline">
                        {load.destination_contact_email}
                      </a>
                    </p>
                  )}
                </div>
              )}

              {load.destination_notes && (
                <div className="pt-2 border-t">
                  <p className="text-sm text-muted-foreground">Notes</p>
                  <p className="text-sm">{load.destination_notes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Messages Section */}
          {workspaceCompany && (
            <div>
              <h2 className="text-lg font-semibold text-foreground mb-4">Messages</h2>
              <LoadConversationPanel
                loadId={id}
                loadNumber={load.load_number || id}
                companyId={workspaceCompany.id}
                userId={user.id}
                partnerCompanyId={load.source_company?.id}
                partnerCompanyName={load.source_company_name}
                driverId={load.assigned_driver_id ?? undefined}
                driverName={load.assigned_driver_name ?? undefined}
              />
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Rate Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Your Rate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                {formatRate(load.carrier_rate, load.carrier_rate_type, load.estimated_cuft)}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                From {load.source_company_name}
              </p>
            </CardContent>
          </Card>

          {/* Trip Assignment */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Route className="h-5 w-5" />
                Trip Assignment
              </CardTitle>
            </CardHeader>
            <CardContent>
              {load.trip_id ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <span className="font-medium">Assigned to Trip</span>
                  </div>
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="font-semibold">Trip #{load.trip?.trip_number}</p>
                    {load.trip?.driver && (
                      <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                        <User className="h-4 w-4" />
                        {load.trip.driver.first_name} {load.trip.driver.last_name}
                      </p>
                    )}
                  </div>
                  <Button variant="outline" asChild className="w-full">
                    <Link href={`/dashboard/trips/${load.trip_id}`}>
                      View Trip
                    </Link>
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-yellow-600 dark:text-yellow-400">
                    <Clock className="h-5 w-5" />
                    <span className="text-sm font-medium">Not assigned to a trip</span>
                  </div>
                  <TripAssignmentForm
                    loadId={id}
                    availableTrips={availableTrips.map((trip) => ({
                      id: trip.id,
                      trip_number: trip.trip_number,
                      driver: Array.isArray(trip.driver) ? trip.driver[0] : trip.driver,
                    }))}
                    assignToTrip={assignToTripAction}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Status Update */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5" />
                Update Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form action={updateStatusAction} className="space-y-4">
                <div className="space-y-2">
                  <Label>Current Status</Label>
                  <div className="mb-3">
                    {getStatusBadge(load.operational_status)}
                    {load.last_status_update && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Updated {new Date(load.last_status_update).toLocaleString()}
                      </p>
                    )}
                  </div>
                  <Label>Change Status</Label>
                  <Select name="status" defaultValue={load.operational_status}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" variant="outline" className="w-full">
                  Update Status
                </Button>
                <p className="text-xs text-center text-muted-foreground">
                  Status updates are shared with {load.source_company_name}
                </p>
              </form>
            </CardContent>
          </Card>

          {/* Driver Info */}
          {load.assigned_driver_name && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Assigned Driver
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="font-medium">{load.assigned_driver_name}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
