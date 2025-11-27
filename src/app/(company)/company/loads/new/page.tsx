import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import Link from 'next/link';
import { createCompanyLoad, getCompanyStorageLocations } from '@/data/company-portal';
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
import { ArrowLeft } from 'lucide-react';

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

export default async function PostLoadPage() {
  const session = await getCompanySession();

  if (!session) {
    redirect('/company-login');
  }

  const storageLocations = await getCompanyStorageLocations(session.company_id);

  async function createLoadAction(formData: FormData) {
    'use server';

    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('company_session');
    if (!sessionCookie) redirect('/company-login');

    const session = JSON.parse(sessionCookie.value);

    const pricingMode = (formData.get('pricing_mode') as string) || 'cuft';
    const cuft = parseFloat(formData.get('estimated_cuft') as string) || 0;
    const weight = parseFloat(formData.get('estimated_weight_lbs') as string) || 0;
    const rateCuft = parseFloat(formData.get('rate_per_cuft') as string) || 0;
    const rateCwt = parseFloat(formData.get('rate_per_cwt') as string) || 0;

    let totalRevenue = 0;
    if (pricingMode === 'cuft') {
      totalRevenue = cuft * rateCuft;
    } else {
      totalRevenue = (weight / 100) * rateCwt;
    }

    const storageLocationId = formData.get('storage_location_id') as string;

    const result = await createCompanyLoad(session.company_id, session.owner_id, {
      internal_reference: (formData.get('internal_reference') as string) || undefined,
      storage_location_id: storageLocationId && storageLocationId !== 'none' ? storageLocationId : undefined,
      storage_unit: (formData.get('storage_unit') as string) || undefined,
      origin_city: formData.get('origin_city') as string,
      origin_state: (formData.get('origin_state') as string).toUpperCase(),
      origin_zip: formData.get('origin_zip') as string,
      destination_city: formData.get('destination_city') as string,
      destination_state: (formData.get('destination_state') as string).toUpperCase(),
      destination_zip: formData.get('destination_zip') as string,
      estimated_cuft: cuft || undefined,
      estimated_weight_lbs: weight || undefined,
      pricing_mode: pricingMode as 'cuft' | 'weight',
      rate_per_cuft: rateCuft || undefined,
      rate_per_cwt: rateCwt || undefined,
      total_revenue: totalRevenue,
      first_available_date: (formData.get('first_available_date') as string) || undefined,
      notes: (formData.get('notes') as string) || undefined,
    });

    if (result.success) {
      revalidatePath('/company/dashboard');
      revalidatePath('/company/loads');
      redirect(`/company/loads/${result.id}`);
    }
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
          <h1 className="font-semibold">Post New Load</h1>
        </div>
      </header>

      <main className="container py-6 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>Load Details</CardTitle>
            <CardDescription>
              Post a load for carrier assignment. Only essential info needed.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={createLoadAction} className="space-y-6">
              {/* Internal Reference */}
              <div>
                <Label htmlFor="internal_reference">Your Reference # (optional)</Label>
                <Input
                  id="internal_reference"
                  name="internal_reference"
                  placeholder="JOB-2024-1234"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Your internal job number for your records
                </p>
              </div>

              {/* Pickup Location */}
              <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
                <h3 className="font-semibold">Pickup Location</h3>

                {storageLocations.length > 0 && (
                  <div>
                    <Label htmlFor="storage_location_id">Storage Location</Label>
                    <Select name="storage_location_id" defaultValue="none">
                      <SelectTrigger>
                        <SelectValue placeholder="Select location (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No storage location</SelectItem>
                        {storageLocations.map((loc) => (
                          <SelectItem key={loc.id} value={loc.id}>
                            {loc.name} - {loc.city}, {loc.state}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div>
                  <Label htmlFor="storage_unit">Unit / Bay (optional)</Label>
                  <Input
                    id="storage_unit"
                    name="storage_unit"
                    placeholder="Bay 12, Unit 205"
                  />
                </div>

                <div className="grid grid-cols-6 gap-2">
                  <div className="col-span-3">
                    <Label htmlFor="origin_city">City *</Label>
                    <Input id="origin_city" name="origin_city" required />
                  </div>
                  <div className="col-span-1">
                    <Label htmlFor="origin_state">State *</Label>
                    <Input
                      id="origin_state"
                      name="origin_state"
                      placeholder="IL"
                      maxLength={2}
                      required
                    />
                  </div>
                  <div className="col-span-2">
                    <Label htmlFor="origin_zip">ZIP *</Label>
                    <Input id="origin_zip" name="origin_zip" required />
                  </div>
                </div>
              </div>

              {/* Delivery Location */}
              <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
                <h3 className="font-semibold">Delivery Location</h3>

                <div className="grid grid-cols-6 gap-2">
                  <div className="col-span-3">
                    <Label htmlFor="destination_city">City *</Label>
                    <Input id="destination_city" name="destination_city" required />
                  </div>
                  <div className="col-span-1">
                    <Label htmlFor="destination_state">State *</Label>
                    <Input
                      id="destination_state"
                      name="destination_state"
                      placeholder="NY"
                      maxLength={2}
                      required
                    />
                  </div>
                  <div className="col-span-2">
                    <Label htmlFor="destination_zip">ZIP *</Label>
                    <Input id="destination_zip" name="destination_zip" required />
                  </div>
                </div>
              </div>

              {/* Load Size & Pricing */}
              <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
                <h3 className="font-semibold">Size & Pricing</h3>

                <div>
                  <Label htmlFor="pricing_mode">Pricing Mode *</Label>
                  <Select name="pricing_mode" defaultValue="cuft">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cuft">Per Cubic Foot (CUFT)</SelectItem>
                      <SelectItem value="weight">Per Hundredweight (CWT)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="estimated_cuft">Cubic Feet</Label>
                    <Input
                      id="estimated_cuft"
                      name="estimated_cuft"
                      type="number"
                      placeholder="650"
                    />
                  </div>
                  <div>
                    <Label htmlFor="rate_per_cuft">Rate per CUFT ($)</Label>
                    <Input
                      id="rate_per_cuft"
                      name="rate_per_cuft"
                      type="number"
                      step="0.01"
                      placeholder="2.50"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="estimated_weight_lbs">Weight (lbs)</Label>
                    <Input
                      id="estimated_weight_lbs"
                      name="estimated_weight_lbs"
                      type="number"
                      placeholder="8000"
                    />
                  </div>
                  <div>
                    <Label htmlFor="rate_per_cwt">Rate per CWT ($)</Label>
                    <Input
                      id="rate_per_cwt"
                      name="rate_per_cwt"
                      type="number"
                      step="0.01"
                      placeholder="45.00"
                    />
                  </div>
                </div>
              </div>

              {/* Dates */}
              <div>
                <Label htmlFor="first_available_date">First Available Date</Label>
                <Input id="first_available_date" name="first_available_date" type="date" />
              </div>

              {/* Notes */}
              <div>
                <Label htmlFor="notes">Notes for Carrier</Label>
                <Textarea
                  id="notes"
                  name="notes"
                  placeholder="Customer flexible on delivery. Call warehouse 1 hour before pickup."
                  rows={3}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  These notes will be visible to the assigned carrier
                </p>
              </div>

              {/* Submit */}
              <div className="flex gap-4 pt-4">
                <Button type="submit" className="flex-1">
                  Post Load
                </Button>
                <Button type="button" variant="outline" asChild>
                  <Link href="/company/dashboard">Cancel</Link>
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
