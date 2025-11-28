'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, PackagePlus, ArrowLeft, Truck, Warehouse, Plus, AlertTriangle, Ban, Building2 } from 'lucide-react';
import { DatePicker } from '@/components/ui/date-picker';
import Link from 'next/link';

interface StorageOption {
  id: string;
  name: string;
  location_type: string;
  city: string;
  state: string;
  zip: string;
  address_line1: string | null;
  unit_numbers: string | null;
  truck_accessibility: string | null;
  gate_code: string | null;
  access_hours: string | null;
  access_instructions: string | null;
}

const SERVICE_TYPES = [
  { value: 'hhg_local', label: 'HHG Local' },
  { value: 'hhg_long_distance', label: 'HHG Long Distance' },
  { value: 'commercial', label: 'Commercial' },
  { value: 'storage_out', label: 'Storage Out' },
  { value: 'freight', label: 'Freight' },
  { value: 'other', label: 'Other' },
];

type LoadType = 'live_load' | 'rfd';
type TruckRequirement = 'any' | 'semi_only' | 'box_truck_only';

export default function PostLoadPage() {
  const router = useRouter();
  const [loadType, setLoadType] = useState<LoadType>('live_load');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [storageOptions, setStorageOptions] = useState<StorageOption[]>([]);
  const [loadingStorage, setLoadingStorage] = useState(true);
  const [selectedStorage, setSelectedStorage] = useState<StorageOption | null>(null);

  // Fetch storage locations on mount
  useEffect(() => {
    async function fetchStorageLocations() {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;

        const { data } = await supabase
          .from('storage_locations')
          .select('id, name, location_type, city, state, zip, address_line1, unit_numbers, truck_accessibility, gate_code, access_hours, access_instructions')
          .eq('owner_id', user.id)
          .eq('is_active', true)
          .order('name');

        setStorageOptions(data || []);
      } catch (err) {
        console.error('Error fetching storage locations:', err);
      } finally {
        setLoadingStorage(false);
      }
    }
    fetchStorageLocations();
  }, []);

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
    is_open_to_counter: false,
    truck_requirement: 'any' as TruckRequirement,
  });

  // RFD form data
  const [rfdData, setRfdData] = useState({
    storage_location_id: '',
    storage_location_name: '',
    storage_address: '',
    storage_city: '',
    storage_state: '',
    storage_zip: '',
    storage_unit_numbers: '',
    destination_address: '',
    destination_city: '',
    destination_state: '',
    destination_zip: '',
    cubic_feet: '',
    rate_per_cuft: '',
    linehaul_amount: '',
    service_type: 'storage_out',
    notes: '',
    is_open_to_counter: false,
    rfd_ready_type: 'ready_now' as 'ready_now' | 'ready_on_date',
    rfd_date: '',
    truck_requirement: 'any' as TruckRequirement,
  });

  // Handler for storage location selection
  const handleStorageSelect = (locationId: string) => {
    const location = storageOptions.find((l) => l.id === locationId);
    if (location) {
      setSelectedStorage(location);
      setRfdData((prev) => ({
        ...prev,
        storage_location_id: location.id,
        storage_location_name: location.name,
        storage_address: location.address_line1 || '',
        storage_city: location.city,
        storage_state: location.state,
        storage_zip: location.zip || '',
        storage_unit_numbers: location.unit_numbers || '',
      }));
    }
  };

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
        load_subtype: loadType === 'rfd' ? 'rfd' : 'live',
        posting_type: 'load',
        posting_status: 'posted',
        posted_at: new Date().toISOString(),
        service_type: data.service_type,
        status: 'pending',
        is_open_to_counter: data.is_open_to_counter,
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
        truck_requirement: data.truck_requirement,
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
        payload.storage_location_id = rfdData.storage_location_id || null;
        payload.current_storage_location = rfdData.storage_location_name;
        payload.pickup_address_line1 = rfdData.storage_address;
        payload.pickup_city = rfdData.storage_city;
        payload.pickup_state = rfdData.storage_state;
        payload.pickup_postal_code = rfdData.storage_zip;
        payload.loading_city = rfdData.storage_city;
        payload.loading_state = rfdData.storage_state;
        payload.loading_postal_code = rfdData.storage_zip;
        payload.storage_unit = rfdData.storage_unit_numbers || null;
        // RFD date - null means "ready now"
        payload.rfd_date = rfdData.rfd_ready_type === 'ready_on_date' && rfdData.rfd_date
          ? rfdData.rfd_date
          : null;
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
    <div className="space-y-4 max-w-4xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/posted-jobs">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-xl font-bold tracking-tight">Post a Load</h1>
          <p className="text-sm text-muted-foreground">
            You pay the carrier for the delivery.
          </p>
        </div>
      </div>

      {error && (
        <div className="bg-destructive/10 text-destructive p-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      <Tabs value={loadType} onValueChange={(v) => setLoadType(v as LoadType)}>
        <TabsList className="grid w-full grid-cols-2 max-w-sm">
          <TabsTrigger value="live_load" className="flex items-center gap-2 text-sm">
            <Truck className="h-4 w-4" />
            Live Load
          </TabsTrigger>
          <TabsTrigger value="rfd" className="flex items-center gap-2 text-sm">
            <Warehouse className="h-4 w-4" />
            RFD
          </TabsTrigger>
        </TabsList>

        {/* Live Load Form */}
        <TabsContent value="live_load">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Customer Info + Pickup Date */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Customer & Pickup</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <Label htmlFor="ll_customer_name" className="text-sm">Customer Name *</Label>
                  <Input
                    id="ll_customer_name"
                    value={liveLoadData.customer_name}
                    onChange={(e) => handleLiveLoadChange('customer_name', e.target.value)}
                    placeholder="John Smith"
                    required
                    className="h-9"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ll_customer_phone" className="text-sm">Customer Phone *</Label>
                  <Input
                    id="ll_customer_phone"
                    type="tel"
                    value={liveLoadData.customer_phone}
                    onChange={(e) => handleLiveLoadChange('customer_phone', e.target.value)}
                    placeholder="(555) 123-4567"
                    required
                    className="h-9"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ll_pickup_date" className="text-sm">Pickup Date *</Label>
                  <DatePicker
                    name="ll_pickup_date"
                    placeholder="Select date"
                    onChange={(value) => handleLiveLoadChange('pickup_date', value)}
                    className="h-9"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Origin & Destination side by side */}
            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Origin</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="ll_origin_address" className="text-sm">Address *</Label>
                    <Input
                      id="ll_origin_address"
                      value={liveLoadData.origin_address}
                      onChange={(e) => handleLiveLoadChange('origin_address', e.target.value)}
                      placeholder="123 Main St"
                      required
                      className="h-9"
                    />
                  </div>
                  <div className="grid gap-2 grid-cols-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="ll_origin_city" className="text-sm">City *</Label>
                      <Input
                        id="ll_origin_city"
                        value={liveLoadData.origin_city}
                        onChange={(e) => handleLiveLoadChange('origin_city', e.target.value)}
                        placeholder="New York"
                        required
                        className="h-9"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="ll_origin_state" className="text-sm">State *</Label>
                      <Input
                        id="ll_origin_state"
                        value={liveLoadData.origin_state}
                        onChange={(e) => handleLiveLoadChange('origin_state', e.target.value)}
                        placeholder="NY"
                        maxLength={2}
                        required
                        className="h-9"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="ll_origin_zip" className="text-sm">ZIP *</Label>
                      <Input
                        id="ll_origin_zip"
                        value={liveLoadData.origin_zip}
                        onChange={(e) => handleLiveLoadChange('origin_zip', e.target.value)}
                        placeholder="10001"
                        required
                        className="h-9"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Destination</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="ll_destination_address" className="text-sm">Address *</Label>
                    <Input
                      id="ll_destination_address"
                      value={liveLoadData.destination_address}
                      onChange={(e) => handleLiveLoadChange('destination_address', e.target.value)}
                      placeholder="456 Oak Ave"
                      required
                      className="h-9"
                    />
                  </div>
                  <div className="grid gap-2 grid-cols-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="ll_destination_city" className="text-sm">City *</Label>
                      <Input
                        id="ll_destination_city"
                        value={liveLoadData.destination_city}
                        onChange={(e) => handleLiveLoadChange('destination_city', e.target.value)}
                        placeholder="Los Angeles"
                        required
                        className="h-9"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="ll_destination_state" className="text-sm">State *</Label>
                      <Input
                        id="ll_destination_state"
                        value={liveLoadData.destination_state}
                        onChange={(e) => handleLiveLoadChange('destination_state', e.target.value)}
                        placeholder="CA"
                        maxLength={2}
                        required
                        className="h-9"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="ll_destination_zip" className="text-sm">ZIP *</Label>
                      <Input
                        id="ll_destination_zip"
                        value={liveLoadData.destination_zip}
                        onChange={(e) => handleLiveLoadChange('destination_zip', e.target.value)}
                        placeholder="90001"
                        required
                        className="h-9"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Pricing & Options */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Pricing & Options</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid gap-3 sm:grid-cols-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="ll_cubic_feet" className="text-sm">CUFT *</Label>
                    <Input
                      id="ll_cubic_feet"
                      type="number"
                      min="1"
                      value={liveLoadData.cubic_feet}
                      onChange={(e) => handleLiveLoadChange('cubic_feet', e.target.value)}
                      placeholder="500"
                      required
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="ll_rate_per_cuft" className="text-sm">Rate/CUFT ($) *</Label>
                    <Input
                      id="ll_rate_per_cuft"
                      type="number"
                      min="0"
                      step="0.01"
                      value={liveLoadData.rate_per_cuft}
                      onChange={(e) => handleLiveLoadChange('rate_per_cuft', e.target.value)}
                      placeholder="3.50"
                      required
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="ll_linehaul_amount" className="text-sm">Linehaul ($) *</Label>
                    <Input
                      id="ll_linehaul_amount"
                      type="number"
                      min="0"
                      step="0.01"
                      value={liveLoadData.linehaul_amount}
                      onChange={(e) => handleLiveLoadChange('linehaul_amount', e.target.value)}
                      placeholder="1750.00"
                      required
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="ll_service_type" className="text-sm">Service Type *</Label>
                    <Select
                      value={liveLoadData.service_type}
                      onValueChange={(value) => handleLiveLoadChange('service_type', value)}
                    >
                      <SelectTrigger id="ll_service_type" className="h-9">
                        <SelectValue placeholder="Select" />
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
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="ll_notes" className="text-sm">Notes</Label>
                  <Textarea
                    id="ll_notes"
                    value={liveLoadData.notes}
                    onChange={(e) => handleLiveLoadChange('notes', e.target.value)}
                    placeholder="Any special instructions"
                    rows={2}
                    className="text-sm"
                  />
                </div>

                <div className="flex items-center gap-3 pt-2 border-t">
                  <Checkbox
                    id="ll_open_to_counter"
                    checked={liveLoadData.is_open_to_counter}
                    onCheckedChange={(checked) =>
                      setLiveLoadData((prev) => ({ ...prev, is_open_to_counter: checked === true }))
                    }
                  />
                  <label htmlFor="ll_open_to_counter" className="cursor-pointer text-sm">
                    Open to counter offers
                  </label>
                </div>

                <div className="pt-2 border-t">
                  <Label className="text-sm mb-2 block">Truck Requirement</Label>
                  <RadioGroup
                    value={liveLoadData.truck_requirement}
                    onValueChange={(value: TruckRequirement) =>
                      setLiveLoadData((prev) => ({ ...prev, truck_requirement: value }))
                    }
                    className="flex flex-wrap gap-4"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="any" id="ll_truck_any" />
                      <Label htmlFor="ll_truck_any" className="font-normal cursor-pointer text-sm">Any</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="semi_only" id="ll_truck_semi" />
                      <Label htmlFor="ll_truck_semi" className="font-normal cursor-pointer text-sm">🚛 Semi Only</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="box_truck_only" id="ll_truck_box" />
                      <Label htmlFor="ll_truck_box" className="font-normal cursor-pointer text-sm">📦 Box Truck Only</Label>
                    </div>
                  </RadioGroup>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" size="sm" asChild>
                <Link href="/dashboard/posted-jobs">Cancel</Link>
              </Button>
              <Button type="submit" size="sm" disabled={isSubmitting}>
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
          <form onSubmit={handleSubmit} className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Storage Location</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Storage Location Selector */}
                <div className="space-y-1.5">
                  <Label htmlFor="rfd_storage_location" className="text-sm">Select Storage Location *</Label>
                  {loadingStorage ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground p-2 border rounded-md">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading...
                    </div>
                  ) : storageOptions.length === 0 ? (
                    <div className="p-3 border rounded-lg bg-muted/50 text-center">
                      <Warehouse className="h-6 w-6 mx-auto text-muted-foreground mb-2" />
                      <p className="text-xs text-muted-foreground mb-2">No storage locations found.</p>
                      <div className="flex gap-2 justify-center">
                        <Button type="button" variant="outline" size="sm" asChild>
                          <Link href="/dashboard/storage/new?type=warehouse">
                            <Building2 className="h-3 w-3 mr-1" />
                            Add Warehouse
                          </Link>
                        </Button>
                        <Button type="button" size="sm" asChild>
                          <Link href="/dashboard/storage/new?type=public_storage">
                            <Warehouse className="h-3 w-3 mr-1" />
                            Add Storage
                          </Link>
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <Select
                        value={rfdData.storage_location_id}
                        onValueChange={handleStorageSelect}
                      >
                        <SelectTrigger id="rfd_storage_location" className="h-9">
                          <SelectValue placeholder="Select location" />
                        </SelectTrigger>
                        <SelectContent>
                          {storageOptions.map((location) => (
                            <SelectItem key={location.id} value={location.id}>
                              <div className="flex items-center gap-2">
                                {location.location_type === 'warehouse' ? (
                                  <Building2 className="h-3 w-3 text-blue-500" />
                                ) : (
                                  <Warehouse className="h-3 w-3 text-purple-500" />
                                )}
                                <span>{location.name}</span>
                                <span className="text-muted-foreground text-xs">
                                  - {location.city}, {location.state}
                                </span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button type="button" variant="outline" size="sm" asChild className="h-9">
                        <Link href="/dashboard/storage/new?type=warehouse">
                          <Plus className="h-3 w-3" />
                        </Link>
                      </Button>
                    </div>
                  )}
                </div>

                {/* Show selected storage details */}
                {selectedStorage && (
                  <div className="p-3 bg-muted/50 rounded-lg space-y-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-medium text-sm">{selectedStorage.name}</h4>
                        <p className="text-xs text-muted-foreground">
                          {selectedStorage.address_line1 && `${selectedStorage.address_line1}, `}
                          {selectedStorage.city}, {selectedStorage.state} {selectedStorage.zip}
                        </p>
                      </div>
                      <Badge
                        variant="outline"
                        className={`text-xs ${
                          selectedStorage.truck_accessibility === 'full'
                            ? 'bg-green-500/20 text-green-600'
                            : selectedStorage.truck_accessibility === 'limited'
                              ? 'bg-yellow-500/20 text-yellow-600'
                              : selectedStorage.truck_accessibility === 'none'
                                ? 'bg-red-500/20 text-red-600'
                                : ''
                        }`}
                      >
                        {selectedStorage.truck_accessibility === 'full' && 'Full Access'}
                        {selectedStorage.truck_accessibility === 'limited' && 'Limited'}
                        {selectedStorage.truck_accessibility === 'none' && 'No Truck'}
                        {!selectedStorage.truck_accessibility && 'Unknown'}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap gap-3 text-xs">
                      {selectedStorage.unit_numbers && (
                        <span><span className="text-muted-foreground">Units:</span> {selectedStorage.unit_numbers}</span>
                      )}
                      {selectedStorage.access_hours && (
                        <span><span className="text-muted-foreground">Hours:</span> {selectedStorage.access_hours}</span>
                      )}
                      {selectedStorage.gate_code && (
                        <span><span className="text-muted-foreground">Gate:</span> <span className="font-mono">{selectedStorage.gate_code}</span></span>
                      )}
                    </div>
                  </div>
                )}

                {/* Unit selection + Ready date */}
                <div className="grid gap-3 sm:grid-cols-2">
                  {selectedStorage?.location_type === 'public_storage' && selectedStorage.unit_numbers && (
                    <div className="space-y-1.5">
                      <Label htmlFor="rfd_unit" className="text-sm">Storage Unit *</Label>
                      <Input
                        id="rfd_unit"
                        value={rfdData.storage_unit_numbers}
                        onChange={(e) => handleRfdChange('storage_unit_numbers', e.target.value)}
                        placeholder="Enter unit (e.g., 101)"
                        className="h-9"
                      />
                    </div>
                  )}
                  <div className="space-y-1.5">
                    <Label className="text-sm">Ready for Delivery</Label>
                    <RadioGroup
                      value={rfdData.rfd_ready_type}
                      onValueChange={(value: 'ready_now' | 'ready_on_date') =>
                        setRfdData((prev) => ({ ...prev, rfd_ready_type: value }))
                      }
                      className="flex gap-4"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="ready_now" id="ready_now" />
                        <Label htmlFor="ready_now" className="font-normal cursor-pointer text-sm">Now</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="ready_on_date" id="ready_on_date" />
                        <Label htmlFor="ready_on_date" className="font-normal cursor-pointer text-sm">On date</Label>
                      </div>
                    </RadioGroup>
                  </div>
                </div>
                {rfdData.rfd_ready_type === 'ready_on_date' && (
                  <div className="space-y-1.5">
                    <Label htmlFor="rfd_date" className="text-sm">Available Date *</Label>
                    <DatePicker
                      name="rfd_date"
                      placeholder="Select date"
                      onChange={(value) => setRfdData((prev) => ({ ...prev, rfd_date: value }))}
                      className="h-9"
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Destination */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Destination</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="rfd_destination_address" className="text-sm">Address *</Label>
                  <Input
                    id="rfd_destination_address"
                    value={rfdData.destination_address}
                    onChange={(e) => handleRfdChange('destination_address', e.target.value)}
                    placeholder="789 Pine Blvd"
                    required
                    className="h-9"
                  />
                </div>
                <div className="grid gap-2 grid-cols-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="rfd_destination_city" className="text-sm">City *</Label>
                    <Input
                      id="rfd_destination_city"
                      value={rfdData.destination_city}
                      onChange={(e) => handleRfdChange('destination_city', e.target.value)}
                      placeholder="Miami"
                      required
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="rfd_destination_state" className="text-sm">State *</Label>
                    <Input
                      id="rfd_destination_state"
                      value={rfdData.destination_state}
                      onChange={(e) => handleRfdChange('destination_state', e.target.value)}
                      placeholder="FL"
                      maxLength={2}
                      required
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="rfd_destination_zip" className="text-sm">ZIP *</Label>
                    <Input
                      id="rfd_destination_zip"
                      value={rfdData.destination_zip}
                      onChange={(e) => handleRfdChange('destination_zip', e.target.value)}
                      placeholder="33101"
                      required
                      className="h-9"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Pricing & Options */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Pricing & Options</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid gap-3 sm:grid-cols-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="rfd_cubic_feet" className="text-sm">CUFT *</Label>
                    <Input
                      id="rfd_cubic_feet"
                      type="number"
                      min="1"
                      value={rfdData.cubic_feet}
                      onChange={(e) => handleRfdChange('cubic_feet', e.target.value)}
                      placeholder="500"
                      required
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="rfd_rate_per_cuft" className="text-sm">Rate/CUFT ($) *</Label>
                    <Input
                      id="rfd_rate_per_cuft"
                      type="number"
                      min="0"
                      step="0.01"
                      value={rfdData.rate_per_cuft}
                      onChange={(e) => handleRfdChange('rate_per_cuft', e.target.value)}
                      placeholder="3.50"
                      required
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="rfd_linehaul_amount" className="text-sm">Linehaul ($) *</Label>
                    <Input
                      id="rfd_linehaul_amount"
                      type="number"
                      min="0"
                      step="0.01"
                      value={rfdData.linehaul_amount}
                      onChange={(e) => handleRfdChange('linehaul_amount', e.target.value)}
                      placeholder="1750.00"
                      required
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="rfd_service_type" className="text-sm">Service Type *</Label>
                    <Select
                      value={rfdData.service_type}
                      onValueChange={(value) => handleRfdChange('service_type', value)}
                    >
                      <SelectTrigger id="rfd_service_type" className="h-9">
                        <SelectValue placeholder="Select" />
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
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="rfd_notes" className="text-sm">Notes</Label>
                  <Textarea
                    id="rfd_notes"
                    value={rfdData.notes}
                    onChange={(e) => handleRfdChange('notes', e.target.value)}
                    placeholder="Any special instructions"
                    rows={2}
                    className="text-sm"
                  />
                </div>

                <div className="flex items-center gap-3 pt-2 border-t">
                  <Checkbox
                    id="rfd_open_to_counter"
                    checked={rfdData.is_open_to_counter}
                    onCheckedChange={(checked) =>
                      setRfdData((prev) => ({ ...prev, is_open_to_counter: checked === true }))
                    }
                  />
                  <label htmlFor="rfd_open_to_counter" className="cursor-pointer text-sm">
                    Open to counter offers
                  </label>
                </div>

                <div className="pt-2 border-t">
                  <Label className="text-sm mb-2 block">Truck Requirement</Label>
                  <RadioGroup
                    value={rfdData.truck_requirement}
                    onValueChange={(value: TruckRequirement) =>
                      setRfdData((prev) => ({ ...prev, truck_requirement: value }))
                    }
                    className="flex flex-wrap gap-4"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="any" id="rfd_truck_any" />
                      <Label htmlFor="rfd_truck_any" className="font-normal cursor-pointer text-sm">Any</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="semi_only" id="rfd_truck_semi" />
                      <Label htmlFor="rfd_truck_semi" className="font-normal cursor-pointer text-sm">🚛 Semi Only</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="box_truck_only" id="rfd_truck_box" />
                      <Label htmlFor="rfd_truck_box" className="font-normal cursor-pointer text-sm">📦 Box Truck Only</Label>
                    </div>
                  </RadioGroup>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" size="sm" asChild>
                <Link href="/dashboard/posted-jobs">Cancel</Link>
              </Button>
              <Button type="submit" size="sm" disabled={isSubmitting}>
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
