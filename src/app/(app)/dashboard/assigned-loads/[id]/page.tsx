import { redirect, notFound } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { getCurrentUser } from '@/lib/supabase-server';
import { getAssignedLoadDetails, updateLoadDriver } from '@/data/marketplace';
import { getDriversForUser } from '@/data/drivers';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
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
  Navigation,
  Key,
  FileText,
  Truck,
} from 'lucide-react';

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

  // Get carrier's drivers for assignment
  const drivers = await getDriversForUser(user.id);

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
        <Badge className={status.color}>{status.label}</Badge>
      </div>

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
