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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Upload, ArrowLeft } from 'lucide-react';
import { DatePicker } from '@/components/ui/date-picker';
import Link from 'next/link';

const SERVICE_TYPES = [
  { value: 'hhg_local', label: 'HHG Local' },
  { value: 'hhg_long_distance', label: 'HHG Long Distance' },
  { value: 'commercial', label: 'Commercial' },
  { value: 'storage_in', label: 'Storage In' },
  { value: 'storage_out', label: 'Storage Out' },
  { value: 'freight', label: 'Freight' },
  { value: 'other', label: 'Other' },
];

export default function PostPickupPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    // Customer info
    customer_name: '',
    customer_phone: '',
    // Pickup date range
    pickup_date_start: '',
    pickup_date_end: '',
    // Origin
    origin_address: '',
    origin_city: '',
    origin_state: '',
    origin_zip: '',
    // Destination
    destination_address: '',
    destination_city: '',
    destination_state: '',
    destination_zip: '',
    // Load details
    cubic_feet: '',
    rate_per_cuft: '',
    balance_due: '',
    service_type: 'hhg_long_distance',
    notes: '',
  });

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
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
      const jobNumber = `PU-${Date.now().toString(36).toUpperCase()}`;

      // Create the pickup posting
      const { error: insertError } = await supabase.from('loads').insert({
        owner_id: user.id,
        company_id: membership.company_id,
        posted_by_company_id: membership.company_id,
        job_number: jobNumber,
        load_type: 'pickup',
        posting_type: 'pickup',
        posting_status: 'posted',
        posted_at: new Date().toISOString(),
        service_type: formData.service_type,
        status: 'pending',
        // Customer info stored in pickup contact
        pickup_contact_name: formData.customer_name,
        pickup_contact_phone: formData.customer_phone,
        // Pickup date range
        pickup_date_start: formData.pickup_date_start || null,
        pickup_date_end: formData.pickup_date_end || null,
        pickup_date: formData.pickup_date_start || null,
        // Origin
        pickup_address_line1: formData.origin_address,
        pickup_city: formData.origin_city,
        pickup_state: formData.origin_state,
        pickup_postal_code: formData.origin_zip,
        // Destination
        dropoff_address_line1: formData.destination_address,
        dropoff_city: formData.destination_city,
        dropoff_state: formData.destination_state,
        dropoff_postal_code: formData.destination_zip,
        delivery_city: formData.destination_city,
        delivery_state: formData.destination_state,
        delivery_postal_code: formData.destination_zip,
        // Load details
        cubic_feet: parseFloat(formData.cubic_feet) || 0,
        rate_per_cuft: parseFloat(formData.rate_per_cuft) || 0,
        balance_due: parseFloat(formData.balance_due) || 0,
        linehaul_amount: parseFloat(formData.balance_due) || 0,
        notes: formData.notes,
      });

      if (insertError) throw insertError;

      // Redirect to posted jobs
      router.push('/dashboard/posted-jobs');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to post pickup');
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
          <h1 className="text-2xl font-bold tracking-tight">Post a Pickup</h1>
          <p className="text-muted-foreground">
            Post a pickup for carriers to service. The carrier will collect the balance from the customer.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="bg-destructive/10 text-destructive p-4 rounded-lg">
            {error}
          </div>
        )}

        {/* Customer Information */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Customer Information</CardTitle>
            <CardDescription>Who is the customer for this pickup?</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="customer_name">Customer Name *</Label>
              <Input
                id="customer_name"
                value={formData.customer_name}
                onChange={(e) => handleChange('customer_name', e.target.value)}
                placeholder="John Smith"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="customer_phone">Customer Phone *</Label>
              <Input
                id="customer_phone"
                type="tel"
                value={formData.customer_phone}
                onChange={(e) => handleChange('customer_phone', e.target.value)}
                placeholder="(555) 123-4567"
                required
              />
            </div>
          </CardContent>
        </Card>

        {/* Pickup Date Range */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Pickup Window</CardTitle>
            <CardDescription>When can the carrier pick up?</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="pickup_date_start">Earliest Pickup Date *</Label>
              <DatePicker
                name="pickup_date_start"
                placeholder="Select earliest date"
                onChange={(value) => handleChange('pickup_date_start', value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pickup_date_end">Latest Pickup Date *</Label>
              <DatePicker
                name="pickup_date_end"
                placeholder="Select latest date"
                onChange={(value) => handleChange('pickup_date_end', value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Origin */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Origin (Pickup Location)</CardTitle>
            <CardDescription>Where will the carrier pick up?</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="space-y-2">
              <Label htmlFor="origin_address">Address *</Label>
              <Input
                id="origin_address"
                value={formData.origin_address}
                onChange={(e) => handleChange('origin_address', e.target.value)}
                placeholder="123 Main St"
                required
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="origin_city">City *</Label>
                <Input
                  id="origin_city"
                  value={formData.origin_city}
                  onChange={(e) => handleChange('origin_city', e.target.value)}
                  placeholder="New York"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="origin_state">State *</Label>
                <Input
                  id="origin_state"
                  value={formData.origin_state}
                  onChange={(e) => handleChange('origin_state', e.target.value)}
                  placeholder="NY"
                  maxLength={2}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="origin_zip">ZIP Code *</Label>
                <Input
                  id="origin_zip"
                  value={formData.origin_zip}
                  onChange={(e) => handleChange('origin_zip', e.target.value)}
                  placeholder="10001"
                  required
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Destination */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Destination (Delivery Location)</CardTitle>
            <CardDescription>Where will the carrier deliver?</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="space-y-2">
              <Label htmlFor="destination_address">Address *</Label>
              <Input
                id="destination_address"
                value={formData.destination_address}
                onChange={(e) => handleChange('destination_address', e.target.value)}
                placeholder="456 Oak Ave"
                required
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="destination_city">City *</Label>
                <Input
                  id="destination_city"
                  value={formData.destination_city}
                  onChange={(e) => handleChange('destination_city', e.target.value)}
                  placeholder="Los Angeles"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="destination_state">State *</Label>
                <Input
                  id="destination_state"
                  value={formData.destination_state}
                  onChange={(e) => handleChange('destination_state', e.target.value)}
                  placeholder="CA"
                  maxLength={2}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="destination_zip">ZIP Code *</Label>
                <Input
                  id="destination_zip"
                  value={formData.destination_zip}
                  onChange={(e) => handleChange('destination_zip', e.target.value)}
                  placeholder="90001"
                  required
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Load Details & Pricing */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Load Details & Pricing</CardTitle>
            <CardDescription>
              Balance due is what the carrier will collect from the customer at delivery.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="cubic_feet">Estimated CUFT *</Label>
                <Input
                  id="cubic_feet"
                  type="number"
                  min="1"
                  value={formData.cubic_feet}
                  onChange={(e) => handleChange('cubic_feet', e.target.value)}
                  placeholder="500"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rate_per_cuft">Rate per CUFT ($) *</Label>
                <Input
                  id="rate_per_cuft"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.rate_per_cuft}
                  onChange={(e) => handleChange('rate_per_cuft', e.target.value)}
                  placeholder="5.00"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="balance_due">Balance Due ($) *</Label>
                <Input
                  id="balance_due"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.balance_due}
                  onChange={(e) => handleChange('balance_due', e.target.value)}
                  placeholder="2500.00"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Amount carrier will collect from customer
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="service_type">Service Type *</Label>
              <Select
                value={formData.service_type}
                onValueChange={(value) => handleChange('service_type', value)}
              >
                <SelectTrigger id="service_type">
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
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => handleChange('notes', e.target.value)}
                placeholder="Any special instructions, access issues, etc."
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Submit */}
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
                <Upload className="mr-2 h-4 w-4" />
                Post Pickup
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
