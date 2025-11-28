'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, PackagePlus, ArrowLeft, Truck, Warehouse } from 'lucide-react';
import Link from 'next/link';

const SERVICE_TYPES = [
  { value: 'hhg_local', label: 'HHG Local' },
  { value: 'hhg_long_distance', label: 'HHG Long Distance' },
  { value: 'commercial', label: 'Commercial' },
  { value: 'storage_out', label: 'Storage Out' },
  { value: 'freight', label: 'Freight' },
  { value: 'other', label: 'Other' },
];

type LoadType = 'live_load' | 'rfd';

export default function PostLoadPage() {
  const router = useRouter();
  const [loadType, setLoadType] = useState<LoadType>('live_load');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Live Load form data
  const [liveLoadData, setLiveLoadData] = useState({
    customer_name: '',
    customer_phone: '',
    pickup_date: '',
    origin_address: '',
    origin_city: '',
    origin_state: '',
    origin_zip: '',
    destination_address: '',
    destination_city: '',
    destination_state: '',
    destination_zip: '',
    cubic_feet: '',
    rate_per_cuft: '',
    linehaul_amount: '',
    service_type: 'hhg_long_distance',
    notes: '',
  });

  // RFD form data
  const [rfdData, setRfdData] = useState({
    storage_location_name: '',
    storage_city: '',
    storage_state: '',
    storage_zip: '',
    destination_address: '',
    destination_city: '',
    destination_state: '',
    destination_zip: '',
    cubic_feet: '',
    rate_per_cuft: '',
    linehaul_amount: '',
    service_type: 'storage_out',
    notes: '',
  });

  const handleLiveLoadChange = (field: string, value: string) => {
    setLiveLoadData((prev) => ({ ...prev, [field]: value }));

    // Auto-calculate linehaul amount
    if (field === 'cubic_feet' || field === 'rate_per_cuft') {
      const cuft = field === 'cubic_feet' ? parseFloat(value) : parseFloat(liveLoadData.cubic_feet);
      const rate = field === 'rate_per_cuft' ? parseFloat(value) : parseFloat(liveLoadData.rate_per_cuft);
      if (!isNaN(cuft) && !isNaN(rate)) {
        setLiveLoadData((prev) => ({
          ...prev,
          [field]: value,
          linehaul_amount: (cuft * rate).toFixed(2),
        }));
      }
    }
  };

  const handleRfdChange = (field: string, value: string) => {
    setRfdData((prev) => ({ ...prev, [field]: value }));

    // Auto-calculate linehaul amount
    if (field === 'cubic_feet' || field === 'rate_per_cuft') {
      const cuft = field === 'cubic_feet' ? parseFloat(value) : parseFloat(rfdData.cubic_feet);
      const rate = field === 'rate_per_cuft' ? parseFloat(value) : parseFloat(rfdData.rate_per_cuft);
      if (!isNaN(cuft) && !isNaN(rate)) {
        setRfdData((prev) => ({
          ...prev,
          [field]: value,
          linehaul_amount: (cuft * rate).toFixed(2),
        }));
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const supabase = createClient();

      // Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get user's workspace company
      const { data: membership } = await supabase
        .from('company_memberships')
        .select('company_id')
        .eq('user_id', user.id)
        .single();

      if (!membership) throw new Error('No company found');

      // Generate job number
      const prefix = loadType === 'live_load' ? 'LL' : 'RFD';
      const jobNumber = `${prefix}-${Date.now().toString(36).toUpperCase()}`;

      const data = loadType === 'live_load' ? liveLoadData : rfdData;

      // Build the insert payload based on load type
      const payload: Record<string, unknown> = {
        owner_id: user.id,
        company_id: membership.company_id,
        posted_by_company_id: membership.company_id,
        job_number: jobNumber,
        load_type: loadType,
        posting_type: 'load',
        posting_status: 'posted',
        posted_at: new Date().toISOString(),
        service_type: data.service_type,
        status: 'pending',
        // Destination (same for both types)
        dropoff_address_line1: data.destination_address,
        dropoff_city: data.destination_city,
        dropoff_state: data.destination_state,
        dropoff_postal_code: data.destination_zip,
        delivery_city: data.destination_city,
        delivery_state: data.destination_state,
        delivery_postal_code: data.destination_zip,
        // Load details
        cubic_feet: parseFloat(data.cubic_feet) || 0,
        rate_per_cuft: parseFloat(data.rate_per_cuft) || 0,
        linehaul_amount: parseFloat(data.linehaul_amount) || 0,
        notes: data.notes,
      };

      if (loadType === 'live_load') {
        // Live load has customer info and origin address
        payload.pickup_contact_name = liveLoadData.customer_name;
        payload.pickup_contact_phone = liveLoadData.customer_phone;
        payload.pickup_date = liveLoadData.pickup_date || null;
        payload.pickup_address_line1 = liveLoadData.origin_address;
        payload.pickup_city = liveLoadData.origin_city;
        payload.pickup_state = liveLoadData.origin_state;
        payload.pickup_postal_code = liveLoadData.origin_zip;
      } else {
        // RFD has storage location info
        payload.current_storage_location = rfdData.storage_location_name;
        payload.loading_city = rfdData.storage_city;
        payload.loading_state = rfdData.storage_state;
        payload.loading_postal_code = rfdData.storage_zip;
      }

      const { error: insertError } = await supabase.from('loads').insert(payload);

      if (insertError) throw insertError;

      // Redirect to posted jobs
      router.push('/dashboard/posted-jobs');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to post load');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/posted-jobs">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Post a Load</h1>
          <p className="text-muted-foreground">
            Post a load for carriers to deliver. You pay the carrier for the delivery.
          </p>
        </div>
      </div>

      {error && (
        <div className="bg-destructive/10 text-destructive p-4 rounded-lg">
          {error}
        </div>
      )}

      <Tabs value={loadType} onValueChange={(v) => setLoadType(v as LoadType)}>
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="live_load" className="flex items-center gap-2">
            <Truck className="h-4 w-4" />
            Live Load
          </TabsTrigger>
          <TabsTrigger value="rfd" className="flex items-center gap-2">
            <Warehouse className="h-4 w-4" />
            RFD (Ready For Delivery)
          </TabsTrigger>
        </TabsList>

        {/* Live Load Form */}
        <TabsContent value="live_load">
          <form onSubmit={handleSubmit} className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Customer Information</CardTitle>
                <CardDescription>
                  Carrier will pick up directly from the customer&apos;s location.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="ll_customer_name">Customer Name *</Label>
                  <Input
                    id="ll_customer_name"
                    value={liveLoadData.customer_name}
                    onChange={(e) => handleLiveLoadChange('customer_name', e.target.value)}
                    placeholder="John Smith"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ll_customer_phone">Customer Phone *</Label>
                  <Input
                    id="ll_customer_phone"
                    type="tel"
                    value={liveLoadData.customer_phone}
                    onChange={(e) => handleLiveLoadChange('customer_phone', e.target.value)}
                    placeholder="(555) 123-4567"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ll_pickup_date">Pickup Date *</Label>
                  <Input
                    id="ll_pickup_date"
                    type="date"
                    value={liveLoadData.pickup_date}
                    onChange={(e) => handleLiveLoadChange('pickup_date', e.target.value)}
                    required
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Origin (Customer Location)</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4">
                <div className="space-y-2">
                  <Label htmlFor="ll_origin_address">Address *</Label>
                  <Input
                    id="ll_origin_address"
                    value={liveLoadData.origin_address}
                    onChange={(e) => handleLiveLoadChange('origin_address', e.target.value)}
                    placeholder="123 Main St"
                    required
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="ll_origin_city">City *</Label>
                    <Input
                      id="ll_origin_city"
                      value={liveLoadData.origin_city}
                      onChange={(e) => handleLiveLoadChange('origin_city', e.target.value)}
                      placeholder="New York"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ll_origin_state">State *</Label>
                    <Input
                      id="ll_origin_state"
                      value={liveLoadData.origin_state}
                      onChange={(e) => handleLiveLoadChange('origin_state', e.target.value)}
                      placeholder="NY"
                      maxLength={2}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ll_origin_zip">ZIP Code *</Label>
                    <Input
                      id="ll_origin_zip"
                      value={liveLoadData.origin_zip}
                      onChange={(e) => handleLiveLoadChange('origin_zip', e.target.value)}
                      placeholder="10001"
                      required
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Destination</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4">
                <div className="space-y-2">
                  <Label htmlFor="ll_destination_address">Address *</Label>
                  <Input
                    id="ll_destination_address"
                    value={liveLoadData.destination_address}
                    onChange={(e) => handleLiveLoadChange('destination_address', e.target.value)}
                    placeholder="456 Oak Ave"
                    required
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="ll_destination_city">City *</Label>
                    <Input
                      id="ll_destination_city"
                      value={liveLoadData.destination_city}
                      onChange={(e) => handleLiveLoadChange('destination_city', e.target.value)}
                      placeholder="Los Angeles"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ll_destination_state">State *</Label>
                    <Input
                      id="ll_destination_state"
                      value={liveLoadData.destination_state}
                      onChange={(e) => handleLiveLoadChange('destination_state', e.target.value)}
                      placeholder="CA"
                      maxLength={2}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ll_destination_zip">ZIP Code *</Label>
                    <Input
                      id="ll_destination_zip"
                      value={liveLoadData.destination_zip}
                      onChange={(e) => handleLiveLoadChange('destination_zip', e.target.value)}
                      placeholder="90001"
                      required
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Load Details & Pricing</CardTitle>
                <CardDescription>
                  Linehaul is what you pay the carrier for delivery.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4">
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="ll_cubic_feet">CUFT *</Label>
                    <Input
                      id="ll_cubic_feet"
                      type="number"
                      min="1"
                      value={liveLoadData.cubic_feet}
                      onChange={(e) => handleLiveLoadChange('cubic_feet', e.target.value)}
                      placeholder="500"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ll_rate_per_cuft">Rate per CUFT ($) *</Label>
                    <Input
                      id="ll_rate_per_cuft"
                      type="number"
                      min="0"
                      step="0.01"
                      value={liveLoadData.rate_per_cuft}
                      onChange={(e) => handleLiveLoadChange('rate_per_cuft', e.target.value)}
                      placeholder="3.50"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ll_linehaul_amount">Linehaul ($) *</Label>
                    <Input
                      id="ll_linehaul_amount"
                      type="number"
                      min="0"
                      step="0.01"
                      value={liveLoadData.linehaul_amount}
                      onChange={(e) => handleLiveLoadChange('linehaul_amount', e.target.value)}
                      placeholder="1750.00"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ll_service_type">Service Type *</Label>
                  <Select
                    value={liveLoadData.service_type}
                    onValueChange={(value) => handleLiveLoadChange('service_type', value)}
                  >
                    <SelectTrigger id="ll_service_type">
                      <SelectValue placeholder="Select service type" />
                    </SelectTrigger>
                    <SelectContent>
                      {SERVICE_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ll_notes">Notes</Label>
                  <Textarea
                    id="ll_notes"
                    value={liveLoadData.notes}
                    onChange={(e) => handleLiveLoadChange('notes', e.target.value)}
                    placeholder="Any special instructions"
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end gap-4">
              <Button type="button" variant="outline" asChild>
                <Link href="/dashboard/posted-jobs">Cancel</Link>
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Posting...
                  </>
                ) : (
                  <>
                    <PackagePlus className="mr-2 h-4 w-4" />
                    Post Live Load
                  </>
                )}
              </Button>
            </div>
          </form>
        </TabsContent>

        {/* RFD Form */}
        <TabsContent value="rfd">
          <form onSubmit={handleSubmit} className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Storage Location</CardTitle>
                <CardDescription>
                  Where the carrier will pick up the load from storage.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4">
                <div className="space-y-2">
                  <Label htmlFor="rfd_storage_location_name">Storage Facility Name *</Label>
                  <Input
                    id="rfd_storage_location_name"
                    value={rfdData.storage_location_name}
                    onChange={(e) => handleRfdChange('storage_location_name', e.target.value)}
                    placeholder="ABC Moving Storage"
                    required
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="rfd_storage_city">City *</Label>
                    <Input
                      id="rfd_storage_city"
                      value={rfdData.storage_city}
                      onChange={(e) => handleRfdChange('storage_city', e.target.value)}
                      placeholder="Chicago"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="rfd_storage_state">State *</Label>
                    <Input
                      id="rfd_storage_state"
                      value={rfdData.storage_state}
                      onChange={(e) => handleRfdChange('storage_state', e.target.value)}
                      placeholder="IL"
                      maxLength={2}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="rfd_storage_zip">ZIP Code *</Label>
                    <Input
                      id="rfd_storage_zip"
                      value={rfdData.storage_zip}
                      onChange={(e) => handleRfdChange('storage_zip', e.target.value)}
                      placeholder="60601"
                      required
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Destination</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4">
                <div className="space-y-2">
                  <Label htmlFor="rfd_destination_address">Address *</Label>
                  <Input
                    id="rfd_destination_address"
                    value={rfdData.destination_address}
                    onChange={(e) => handleRfdChange('destination_address', e.target.value)}
                    placeholder="789 Pine Blvd"
                    required
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="rfd_destination_city">City *</Label>
                    <Input
                      id="rfd_destination_city"
                      value={rfdData.destination_city}
                      onChange={(e) => handleRfdChange('destination_city', e.target.value)}
                      placeholder="Miami"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="rfd_destination_state">State *</Label>
                    <Input
                      id="rfd_destination_state"
                      value={rfdData.destination_state}
                      onChange={(e) => handleRfdChange('destination_state', e.target.value)}
                      placeholder="FL"
                      maxLength={2}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="rfd_destination_zip">ZIP Code *</Label>
                    <Input
                      id="rfd_destination_zip"
                      value={rfdData.destination_zip}
                      onChange={(e) => handleRfdChange('destination_zip', e.target.value)}
                      placeholder="33101"
                      required
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Load Details & Pricing</CardTitle>
                <CardDescription>
                  Linehaul is what you pay the carrier for delivery.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4">
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="rfd_cubic_feet">CUFT *</Label>
                    <Input
                      id="rfd_cubic_feet"
                      type="number"
                      min="1"
                      value={rfdData.cubic_feet}
                      onChange={(e) => handleRfdChange('cubic_feet', e.target.value)}
                      placeholder="500"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="rfd_rate_per_cuft">Rate per CUFT ($) *</Label>
                    <Input
                      id="rfd_rate_per_cuft"
                      type="number"
                      min="0"
                      step="0.01"
                      value={rfdData.rate_per_cuft}
                      onChange={(e) => handleRfdChange('rate_per_cuft', e.target.value)}
                      placeholder="3.50"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="rfd_linehaul_amount">Linehaul ($) *</Label>
                    <Input
                      id="rfd_linehaul_amount"
                      type="number"
                      min="0"
                      step="0.01"
                      value={rfdData.linehaul_amount}
                      onChange={(e) => handleRfdChange('linehaul_amount', e.target.value)}
                      placeholder="1750.00"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="rfd_service_type">Service Type *</Label>
                  <Select
                    value={rfdData.service_type}
                    onValueChange={(value) => handleRfdChange('service_type', value)}
                  >
                    <SelectTrigger id="rfd_service_type">
                      <SelectValue placeholder="Select service type" />
                    </SelectTrigger>
                    <SelectContent>
                      {SERVICE_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="rfd_notes">Notes</Label>
                  <Textarea
                    id="rfd_notes"
                    value={rfdData.notes}
                    onChange={(e) => handleRfdChange('notes', e.target.value)}
                    placeholder="Any special instructions"
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end gap-4">
              <Button type="button" variant="outline" asChild>
                <Link href="/dashboard/posted-jobs">Cancel</Link>
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Posting...
                  </>
                ) : (
                  <>
                    <PackagePlus className="mr-2 h-4 w-4" />
                    Post RFD Load
                  </>
                )}
              </Button>
            </div>
          </form>
        </TabsContent>
      </Tabs>
    </div>
  );
}
