import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

import { getCurrentUser } from '@/lib/supabase-server';
import { createStorageLocation } from '@/data/storage-locations';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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

export default async function NewStorageLocationPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  async function createAction(formData: FormData) {
    'use server';

    const user = await getCurrentUser();
    if (!user) redirect('/login');

    const result = await createStorageLocation(user.id, {
      name: formData.get('name') as string,
      code: (formData.get('code') as string) || null,
      location_type: formData.get('location_type') as string,
      address_line1: formData.get('address_line1') as string,
      address_line2: (formData.get('address_line2') as string) || null,
      city: formData.get('city') as string,
      state: formData.get('state') as string,
      zip: formData.get('zip') as string,
      contact_name: (formData.get('contact_name') as string) || null,
      contact_phone: (formData.get('contact_phone') as string) || null,
      contact_email: (formData.get('contact_email') as string) || null,
      access_hours: (formData.get('access_hours') as string) || null,
      access_instructions: (formData.get('access_instructions') as string) || null,
      special_notes: (formData.get('special_notes') as string) || null,
      gate_code: (formData.get('gate_code') as string) || null,
      monthly_rent: formData.get('monthly_rent')
        ? parseFloat(formData.get('monthly_rent') as string)
        : null,
      rent_due_day: formData.get('rent_due_day')
        ? parseInt(formData.get('rent_due_day') as string)
        : null,
    });

    if (result.success) {
      revalidatePath('/dashboard/storage');
      redirect('/dashboard/storage');
    }
  }

  return (
    <div className="container max-w-2xl py-6">
      <div className="mb-6">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/dashboard/storage">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Storage Locations
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Add Storage Location</CardTitle>
          <CardDescription>
            Add a warehouse, public storage unit, or partner facility
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={createAction} className="space-y-6">
            {/* Basic Info */}
            <div className="space-y-4">
              <h3 className="font-semibold">Basic Information</h3>

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 sm:col-span-1">
                  <Label htmlFor="name">Location Name *</Label>
                  <Input id="name" name="name" placeholder="ABC Warehouse Chicago" required />
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <Label htmlFor="code">Location Code</Label>
                  <Input id="code" name="code" placeholder="CHI-1" />
                </div>
              </div>

              <div>
                <Label htmlFor="location_type">Location Type *</Label>
                <Select name="location_type" defaultValue="warehouse">
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="warehouse">Warehouse</SelectItem>
                    <SelectItem value="public_storage">Public Storage</SelectItem>
                    <SelectItem value="partner_facility">Partner Facility</SelectItem>
                    <SelectItem value="container_yard">Container Yard</SelectItem>
                    <SelectItem value="vault_storage">Vault Storage</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Address */}
            <div className="space-y-4">
              <h3 className="font-semibold">Address</h3>

              <div>
                <Label htmlFor="address_line1">Street Address *</Label>
                <Input
                  id="address_line1"
                  name="address_line1"
                  placeholder="1234 Industrial Blvd"
                  required
                />
              </div>

              <div>
                <Label htmlFor="address_line2">Suite / Unit / Bay</Label>
                <Input
                  id="address_line2"
                  name="address_line2"
                  placeholder="Unit 205 or Bay 12"
                />
              </div>

              <div className="grid grid-cols-6 gap-4">
                <div className="col-span-3">
                  <Label htmlFor="city">City *</Label>
                  <Input id="city" name="city" required />
                </div>
                <div className="col-span-1">
                  <Label htmlFor="state">State *</Label>
                  <Input id="state" name="state" placeholder="IL" maxLength={2} required />
                </div>
                <div className="col-span-2">
                  <Label htmlFor="zip">ZIP *</Label>
                  <Input id="zip" name="zip" required />
                </div>
              </div>
            </div>

            {/* Contact */}
            <div className="space-y-4">
              <h3 className="font-semibold">Contact at Location</h3>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="contact_name">Contact Name</Label>
                  <Input id="contact_name" name="contact_name" placeholder="Mike" />
                </div>
                <div>
                  <Label htmlFor="contact_phone">Contact Phone</Label>
                  <Input id="contact_phone" name="contact_phone" placeholder="312-555-1234" />
                </div>
              </div>

              <div>
                <Label htmlFor="contact_email">Contact Email</Label>
                <Input id="contact_email" name="contact_email" type="email" />
              </div>
            </div>

            {/* Access Instructions */}
            <div className="space-y-4">
              <h3 className="font-semibold">Access Information</h3>

              <div>
                <Label htmlFor="access_hours">Access Hours</Label>
                <Input
                  id="access_hours"
                  name="access_hours"
                  placeholder="Mon-Fri 8am-5pm, Sat 9am-12pm"
                />
              </div>

              <div>
                <Label htmlFor="gate_code">Gate Code</Label>
                <Input id="gate_code" name="gate_code" placeholder="1234#" />
              </div>

              <div>
                <Label htmlFor="access_instructions">Access Instructions</Label>
                <Textarea
                  id="access_instructions"
                  name="access_instructions"
                  placeholder="Enter through back gate, check in at office first"
                  rows={2}
                />
              </div>

              <div>
                <Label htmlFor="special_notes">Special Notes</Label>
                <Textarea
                  id="special_notes"
                  name="special_notes"
                  placeholder="Call 30 min before arrival, no overnight parking"
                  rows={2}
                />
              </div>
            </div>

            {/* Rental Info (for public storage) */}
            <div className="space-y-4">
              <h3 className="font-semibold">Rental Information (Optional)</h3>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="monthly_rent">Monthly Rent ($)</Label>
                  <Input
                    id="monthly_rent"
                    name="monthly_rent"
                    type="number"
                    step="0.01"
                    placeholder="500.00"
                  />
                </div>
                <div>
                  <Label htmlFor="rent_due_day">Rent Due Day</Label>
                  <Input
                    id="rent_due_day"
                    name="rent_due_day"
                    type="number"
                    min="1"
                    max="31"
                    placeholder="1"
                  />
                </div>
              </div>
            </div>

            {/* Submit */}
            <div className="flex gap-4 pt-4">
              <Button type="submit" className="flex-1">
                Add Location
              </Button>
              <Button type="button" variant="outline" asChild>
                <Link href="/dashboard/storage">Cancel</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
