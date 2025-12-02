import { redirect, notFound } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { getCurrentUser, createClient } from '@/lib/supabase-server';
import { confirmLoadAssignment } from '@/data/marketplace';
import { getDriversForUser } from '@/data/drivers';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DatePicker } from '@/components/ui/date-picker';
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
  CheckCircle,
  DollarSign,
  Building2,
} from 'lucide-react';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ConfirmLoadPage({ params }: PageProps) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const supabase = await createClient();

  // Get load with carrier assignment info
  const { data: load, error } = await supabase
    .from('loads')
    .select(
      `
      *,
      company:companies!loads_company_id_fkey(id, name)
    `
    )
    .eq('id', id)
    .single();

  if (error || !load) {
    notFound();
  }

  // Verify this carrier owns this load assignment
  const { data: request } = await supabase
    .from('load_requests')
    .select('*')
    .eq('load_id', id)
    .eq('carrier_owner_id', user.id)
    .eq('status', 'accepted')
    .single();

  if (!request) {
    redirect('/dashboard/my-requests');
  }

  // Check if already confirmed
  if (load.carrier_confirmed_at) {
    redirect(`/dashboard/assigned-loads/${id}`);
  }

  // Get carrier's drivers
  const drivers = await getDriversForUser(user.id);

  async function confirmAction(formData: FormData) {
    'use server';

    const currentUser = await getCurrentUser();
    if (!currentUser) redirect('/login');

    const supabaseClient = await createClient();
    const driverType = formData.get('driver_type') as string;

    let driverName: string | undefined;
    let driverPhone: string | undefined;
    let driverId: string | undefined;

    if (driverType === 'existing') {
      driverId = formData.get('driver_id') as string;
      if (driverId && driverId !== 'none') {
        const { data: driver } = await supabaseClient
          .from('drivers')
          .select('id, first_name, last_name, phone')
          .eq('id', driverId)
          .single();

        if (driver) {
          driverName = `${driver.first_name} ${driver.last_name}`;
          driverPhone = driver.phone || undefined;
        }
      }
    } else if (driverType === 'manual') {
      const name = formData.get('driver_name') as string;
      const phone = formData.get('driver_phone') as string;
      if (name) driverName = name;
      if (phone) driverPhone = phone;
    }
    // If driverType === 'later', all driver fields remain undefined

    const expectedLoadDate = formData.get('expected_load_date') as string;

    const result = await confirmLoadAssignment(id, {
      expected_load_date: expectedLoadDate,
      assigned_driver_id: driverId,
      assigned_driver_name: driverName,
      assigned_driver_phone: driverPhone,
    });

    if (result.success) {
      revalidatePath('/dashboard/my-requests');
      revalidatePath('/dashboard/assigned-loads');
      redirect(`/dashboard/assigned-loads/${id}`);
    }
  }

  const company = Array.isArray(load.company) ? load.company[0] : load.company;

  // Map DB fields to display - DB uses pickup_*/delivery_*/cubic_feet
  const cuft = load.cubic_feet || load.estimated_cuft;
  const totalValue =
    load.carrier_rate && cuft
      ? load.carrier_rate * cuft
      : null;

  return (
    <div className="container py-6 max-w-2xl space-y-6">
      {/* Back Button */}
      <Button variant="ghost" size="sm" asChild>
        <Link href="/dashboard/my-requests">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to My Requests
        </Link>
      </Button>

      {/* Header */}
      <div>
        <Badge className="bg-green-500/20 text-green-400 mb-2">
          <CheckCircle className="h-3 w-3 mr-1" />
          Request Accepted
        </Badge>
        <h1 className="text-2xl font-bold">Confirm Load Details</h1>
        <p className="text-muted-foreground">
          Provide expected load date to proceed. Driver can be assigned later.
        </p>
      </div>

      {/* Load Summary */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <Building2 className="h-4 w-4" />
            <span>{company?.name}</span>
            <span>•</span>
            <span>{load.load_number}</span>
          </div>

          <div className="flex items-center gap-2 mb-3">
            <p className="font-semibold text-lg">
              {load.pickup_city || load.origin_city}, {load.pickup_state || load.origin_state} {load.pickup_postal_code || load.origin_zip}
            </p>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
            <p className="font-semibold text-lg">
              {load.delivery_city || load.destination_city}, {load.delivery_state || load.destination_state}{' '}
              {load.delivery_postal_code || load.destination_zip}
            </p>
          </div>

          <div className="flex items-center gap-4 text-sm">
            <span className="flex items-center gap-1">
              <Package className="h-4 w-4 text-muted-foreground" />
              {cuft} CUFT
            </span>
            <span className="flex items-center gap-1 text-green-500 font-semibold">
              <DollarSign className="h-4 w-4" />$
              {load.carrier_rate?.toFixed(2)}/cf
              {totalValue && ` = $${totalValue.toLocaleString()}`}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Confirmation Form */}
      <Card>
        <CardHeader>
          <CardTitle>Confirm Details</CardTitle>
          <CardDescription>
            Once confirmed, pickup location will be revealed
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={confirmAction} className="space-y-6">
            {/* Expected Load Date - REQUIRED */}
            <div>
              <Label
                htmlFor="expected_load_date"
                className="flex items-center gap-2"
              >
                <Calendar className="h-4 w-4" />
                Expected Load Date *
              </Label>
              <DatePicker
                name="expected_load_date"
                placeholder="Select load date"
                className="mt-1 w-48 h-10"
              />
              <p className="text-xs text-muted-foreground mt-1">
                When do you plan to pick up this load?
              </p>
            </div>

            <Separator />

            {/* Driver Selection - OPTIONAL */}
            <div className="space-y-4">
              <Label className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Assigned Driver
                <span className="text-sm text-muted-foreground font-normal">
                  (optional)
                </span>
              </Label>

              <RadioGroup
                name="driver_type"
                defaultValue="later"
                className="space-y-3"
              >
                {/* Assign later - DEFAULT */}
                <div className="flex items-start space-x-3 p-4 border rounded-lg bg-muted/30">
                  <RadioGroupItem
                    value="later"
                    id="driver_later"
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <Label htmlFor="driver_later" className="font-medium">
                      Assign driver later
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      You can add driver info anytime before pickup
                    </p>
                  </div>
                </div>

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
                              {driver.phone && ` • ${driver.phone}`}
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
            </div>

            {/* Submit */}
            <Button type="submit" className="w-full" size="lg">
              <CheckCircle className="h-4 w-4 mr-2" />
              Confirm Load
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* What Happens Next */}
      <Card className="bg-muted/50">
        <CardContent className="p-4">
          <h4 className="font-medium mb-2">What happens next?</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Full pickup address and contact info will be revealed</li>
            <li>• Company will see expected load date</li>
            <li>• Driver info shared with company when assigned</li>
            <li>• Load will appear in your assigned loads</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
