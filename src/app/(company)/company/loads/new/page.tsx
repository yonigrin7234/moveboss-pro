import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import Link from 'next/link';
import { createClient } from '@/lib/supabase-server';
import { getCompanyStorageLocations } from '@/data/company-portal';
import { notifyPartnersOfNewLoad } from '@/data/notifications';
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowLeft, MapPin, Package, Calendar, DollarSign, Truck, Eye } from 'lucide-react';

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

  async function postLoadAction(formData: FormData) {
    'use server';

    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('company_session');
    if (!sessionCookie) redirect('/company-login');

    const session = JSON.parse(sessionCookie.value);
    const supabase = await createClient();

    // Generate load number
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.random().toString(36).substring(2, 5).toUpperCase();
    const load_number = `LD-${timestamp}-${random}`;

    // Parse form data
    const pickupType = formData.get('pickup_type') as string;
    const pricingMode = (formData.get('pricing_mode') as string) || 'per_cuft';
    const availabilityType = formData.get('availability_type') as string;
    const rateType = formData.get('rate_type') as string;

    const cuft = parseFloat(formData.get('estimated_cuft') as string) || 0;
    const weight = parseFloat(formData.get('estimated_weight_lbs') as string) || 0;
    const companyRate = parseFloat(formData.get('company_rate') as string) || 0;

    // Calculate total
    let totalRevenue = 0;
    if (pricingMode === 'per_cuft' && cuft && companyRate) {
      totalRevenue = cuft * companyRate;
    } else if (pricingMode === 'per_cwt' && weight && companyRate) {
      totalRevenue = (weight / 100) * companyRate;
    }

    // Build pickup data
    let pickupData: Record<string, string | null> = {};
    let storageLocationId: string | null = null;

    if (pickupType === 'saved') {
      const locId = formData.get('storage_location_id') as string;
      if (locId && locId !== 'none') {
        storageLocationId = locId;

        // Get storage location details to populate pickup fields
        const { data: storageLocation } = await supabase
          .from('storage_locations')
          .select('*')
          .eq('id', storageLocationId)
          .single();

        if (storageLocation) {
          pickupData = {
            pickup_location_name: storageLocation.name,
            pickup_address_line1: storageLocation.address_line1,
            pickup_address_line2: storageLocation.address_line2,
            pickup_city: storageLocation.city,
            pickup_state: storageLocation.state,
            pickup_zip: storageLocation.zip,
            pickup_contact_name: storageLocation.contact_name,
            pickup_contact_phone: storageLocation.contact_phone,
            pickup_gate_code: storageLocation.gate_code,
            pickup_access_hours: storageLocation.access_hours,
            pickup_instructions: storageLocation.special_notes,
          };
        }
      }
    } else {
      // New location
      pickupData = {
        pickup_location_name: (formData.get('pickup_location_name') as string) || null,
        pickup_address_line1: (formData.get('pickup_address_line1') as string) || null,
        pickup_address_line2: (formData.get('pickup_address_line2') as string) || null,
        pickup_city: (formData.get('pickup_city') as string) || null,
        pickup_state: (formData.get('pickup_state') as string) || null,
        pickup_zip: (formData.get('pickup_zip') as string) || null,
        pickup_contact_name: (formData.get('pickup_contact_name') as string) || null,
        pickup_contact_phone: (formData.get('pickup_contact_phone') as string) || null,
        pickup_gate_code: (formData.get('pickup_gate_code') as string) || null,
        pickup_access_hours: (formData.get('pickup_access_hours') as string) || null,
        pickup_instructions: (formData.get('pickup_instructions') as string) || null,
      };

      // Optionally save new location
      const saveLocation = formData.get('save_location') === 'on';
      if (saveLocation && pickupData.pickup_location_name) {
        await supabase.from('storage_locations').insert({
          owner_id: session.owner_id,
          company_id: session.company_id,
          name: pickupData.pickup_location_name,
          location_type: 'public_storage',
          address_line1: pickupData.pickup_address_line1,
          address_line2: pickupData.pickup_address_line2,
          city: pickupData.pickup_city,
          state: pickupData.pickup_state,
          zip: pickupData.pickup_zip,
          contact_name: pickupData.pickup_contact_name,
          contact_phone: pickupData.pickup_contact_phone,
          gate_code: pickupData.pickup_gate_code,
          access_hours: pickupData.pickup_access_hours,
          special_notes: pickupData.pickup_instructions,
          is_active: true,
        });
      }
    }

    // Equipment type
    const equipmentType = formData.get('equipment_type') as string;

    // Origin - use pickup city/state/zip or form fields
    const originCity =
      pickupData.pickup_city || (formData.get('pickup_city') as string) || '';
    const originState =
      pickupData.pickup_state || (formData.get('pickup_state') as string) || '';
    const originZip =
      pickupData.pickup_zip || (formData.get('pickup_zip') as string) || '';

    // Marketplace options
    const postToMarketplace = formData.get('post_to_marketplace') === 'on';
    const pushToPartners = formData.get('push_to_partners') === 'on';

    // Insert load
    const { data: newLoad, error } = await supabase
      .from('loads')
      .insert({
        owner_id: session.owner_id,
        company_id: session.company_id,
        load_number,
        load_status: 'pending',
        load_type: 'standard',

        // Pickup
        storage_location_id: storageLocationId,
        storage_unit: (formData.get('storage_unit') as string) || null,
        ...pickupData,

        // Origin
        origin_city: originCity.toUpperCase(),
        origin_state: originState.toUpperCase(),
        origin_zip: originZip,

        // Destination
        destination_city: ((formData.get('destination_city') as string) || '').toUpperCase(),
        destination_state: ((formData.get('destination_state') as string) || '').toUpperCase(),
        destination_zip: (formData.get('destination_zip') as string) || '',

        // Size
        estimated_cuft: cuft || null,
        estimated_weight_lbs: weight || null,
        pieces_count: parseInt(formData.get('pieces_count') as string) || null,
        pricing_mode: pricingMode,

        // Rate
        company_rate: companyRate || null,
        company_rate_type: pricingMode,
        rate_is_fixed: rateType === 'fixed',
        total_revenue: totalRevenue || null,

        // Availability
        is_ready_now: availabilityType === 'ready_now',
        available_date:
          availabilityType === 'future_date'
            ? (formData.get('available_date') as string) || null
            : null,
        delivery_urgency: (formData.get('delivery_urgency') as string) || 'standard',

        // Equipment
        equipment_type: equipmentType === 'any' ? null : equipmentType,

        // Marketplace
        is_marketplace_visible: postToMarketplace,
        push_to_partners: pushToPartners,
        posted_to_marketplace_at: postToMarketplace ? new Date().toISOString() : null,

        // Other
        internal_reference: (formData.get('internal_reference') as string) || null,
        special_instructions: (formData.get('notes') as string) || null,
      })
      .select('id')
      .single();

    if (error) {
      console.error('Error creating load:', error);
      return;
    }

    // Notify partner carriers if push_to_partners is enabled
    if (pushToPartners) {
      const destCity = ((formData.get('destination_city') as string) || '').toUpperCase();
      const destState = ((formData.get('destination_state') as string) || '').toUpperCase();
      const route = `${originCity}, ${originState} → ${destCity}, ${destState}`;

      await notifyPartnersOfNewLoad(
        session.company_id,
        session.company_name,
        newLoad.id,
        load_number,
        route,
        cuft,
        companyRate || null
      );
    }

    revalidatePath('/company/dashboard');
    revalidatePath('/company/loads');
    redirect(`/company/loads/${newLoad.id}`);
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
          <h1 className="font-semibold">Post Load to Marketplace</h1>
        </div>
      </header>

      <main className="container py-6 max-w-2xl">
        <form action={postLoadAction} className="space-y-6">
          {/* Internal Reference */}
          <div>
            <Label htmlFor="internal_reference">Your Reference # (optional)</Label>
            <Input id="internal_reference" name="internal_reference" placeholder="JOB-2024-1234" />
            <p className="text-xs text-muted-foreground mt-1">
              Your internal job number for your records
            </p>
          </div>

          {/* STEP 1: Pickup Location */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Pickup Location
              </CardTitle>
              <CardDescription>Where is this load stored?</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <RadioGroup
                name="pickup_type"
                defaultValue={storageLocations.length > 0 ? 'saved' : 'new'}
                className="space-y-4"
              >
                {storageLocations.length > 0 && (
                  <div className="flex items-start space-x-3">
                    <RadioGroupItem value="saved" id="pickup_saved" className="mt-1" />
                    <div className="flex-1 space-y-2">
                      <Label htmlFor="pickup_saved">Select from my locations</Label>
                      <Select name="storage_location_id" defaultValue="none">
                        <SelectTrigger>
                          <SelectValue placeholder="Choose location" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Select a location</SelectItem>
                          {storageLocations.map((loc) => (
                            <SelectItem key={loc.id} value={loc.id}>
                              {loc.name} - {loc.city}, {loc.state}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <div>
                        <Label htmlFor="storage_unit">Unit / Bay</Label>
                        <Input
                          id="storage_unit"
                          name="storage_unit"
                          placeholder="Bay 12, Unit 205"
                        />
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex items-start space-x-3">
                  <RadioGroupItem value="new" id="pickup_new" className="mt-1" />
                  <div className="flex-1 space-y-3">
                    <Label htmlFor="pickup_new">New location (one-time or save)</Label>

                    <div className="p-4 bg-muted/50 rounded-lg space-y-3">
                      <div>
                        <Label htmlFor="pickup_location_name">Location Name</Label>
                        <Input
                          id="pickup_location_name"
                          name="pickup_location_name"
                          placeholder="Public Storage Chicago"
                        />
                      </div>

                      <div>
                        <Label htmlFor="pickup_address_line1">Address</Label>
                        <Input
                          id="pickup_address_line1"
                          name="pickup_address_line1"
                          placeholder="1234 W Industrial Ave"
                        />
                      </div>

                      <div className="grid grid-cols-6 gap-2">
                        <div className="col-span-3">
                          <Label htmlFor="pickup_city">City *</Label>
                          <Input id="pickup_city" name="pickup_city" />
                        </div>
                        <div className="col-span-1">
                          <Label htmlFor="pickup_state">State *</Label>
                          <Input
                            id="pickup_state"
                            name="pickup_state"
                            placeholder="IL"
                            maxLength={2}
                          />
                        </div>
                        <div className="col-span-2">
                          <Label htmlFor="pickup_zip">ZIP *</Label>
                          <Input id="pickup_zip" name="pickup_zip" />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label htmlFor="pickup_contact_name">Contact Name</Label>
                          <Input
                            id="pickup_contact_name"
                            name="pickup_contact_name"
                            placeholder="Mike at front desk"
                          />
                        </div>
                        <div>
                          <Label htmlFor="pickup_contact_phone">Contact Phone</Label>
                          <Input
                            id="pickup_contact_phone"
                            name="pickup_contact_phone"
                            placeholder="312-555-1234"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label htmlFor="pickup_gate_code">Gate Code</Label>
                          <Input id="pickup_gate_code" name="pickup_gate_code" placeholder="4521" />
                        </div>
                        <div>
                          <Label htmlFor="pickup_access_hours">Access Hours</Label>
                          <Input
                            id="pickup_access_hours"
                            name="pickup_access_hours"
                            placeholder="6am - 9pm"
                          />
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="pickup_instructions">Pickup Instructions</Label>
                        <Textarea
                          id="pickup_instructions"
                          name="pickup_instructions"
                          placeholder="Call 30 min before arrival. Bring ID."
                          rows={2}
                        />
                      </div>

                      <div className="flex items-center space-x-2">
                        <Checkbox id="save_location" name="save_location" />
                        <Label htmlFor="save_location" className="text-sm font-normal">
                          Save this location for future use
                        </Label>
                      </div>
                    </div>
                  </div>
                </div>
              </RadioGroup>
            </CardContent>
          </Card>

          {/* STEP 2: Delivery Destination */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Delivery Destination
              </CardTitle>
              <CardDescription>
                Where is this load going? Full address provided after assignment.
              </CardDescription>
            </CardHeader>
            <CardContent>
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
            </CardContent>
          </Card>

          {/* STEP 3: Load Size */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Load Size
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Pricing Mode *</Label>
                <RadioGroup name="pricing_mode" defaultValue="per_cuft" className="flex gap-4 mt-2">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="per_cuft" id="pricing_cuft" />
                    <Label htmlFor="pricing_cuft">Cubic Feet (CUFT)</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="per_cwt" id="pricing_cwt" />
                    <Label htmlFor="pricing_cwt">Weight (CWT)</Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="grid grid-cols-3 gap-4">
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
                  <Label htmlFor="estimated_weight_lbs">Weight (lbs)</Label>
                  <Input
                    id="estimated_weight_lbs"
                    name="estimated_weight_lbs"
                    type="number"
                    placeholder="8000"
                  />
                </div>
                <div>
                  <Label htmlFor="pieces_count">Pieces</Label>
                  <Input id="pieces_count" name="pieces_count" type="number" placeholder="45" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* STEP 4: Availability */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Availability
              </CardTitle>
              <CardDescription>When can this load be picked up?</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <RadioGroup name="availability_type" defaultValue="ready_now" className="space-y-3">
                <div className="flex items-center space-x-3">
                  <RadioGroupItem value="ready_now" id="avail_now" />
                  <Label htmlFor="avail_now">Ready Now - Available for immediate pickup</Label>
                </div>
                <div className="flex items-start space-x-3">
                  <RadioGroupItem value="future_date" id="avail_future" className="mt-1" />
                  <div className="flex-1">
                    <Label htmlFor="avail_future">Available Starting</Label>
                    <Input type="date" name="available_date" className="mt-1 w-48" />
                  </div>
                </div>
              </RadioGroup>

              <div>
                <Label htmlFor="delivery_urgency">Delivery Flexibility</Label>
                <Select name="delivery_urgency" defaultValue="standard">
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="flexible">Flexible - No rush</SelectItem>
                    <SelectItem value="standard">Standard - Within 2 weeks</SelectItem>
                    <SelectItem value="expedited">Expedited - ASAP</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* STEP 5: Rate */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Your Rate
              </CardTitle>
              <CardDescription>What are you paying for this load?</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <Label htmlFor="company_rate">Rate</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">$</span>
                    <Input
                      id="company_rate"
                      name="company_rate"
                      type="number"
                      step="0.01"
                      placeholder="2.50"
                      className="w-32"
                    />
                    <span className="text-muted-foreground">per CUFT/CWT</span>
                  </div>
                </div>
              </div>

              <RadioGroup name="rate_type" defaultValue="fixed" className="space-y-3">
                <div className="flex items-start space-x-3">
                  <RadioGroupItem value="fixed" id="rate_fixed" className="mt-1" />
                  <div>
                    <Label htmlFor="rate_fixed">Fixed Rate</Label>
                    <p className="text-sm text-muted-foreground">
                      Carriers accept this rate or skip
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <RadioGroupItem value="open" id="rate_open" className="mt-1" />
                  <div>
                    <Label htmlFor="rate_open">Open to Offers</Label>
                    <p className="text-sm text-muted-foreground">Carriers can propose their rate</p>
                  </div>
                </div>
              </RadioGroup>
            </CardContent>
          </Card>

          {/* STEP 6: Equipment */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Truck className="h-5 w-5" />
                Equipment Requirement
              </CardTitle>
              <CardDescription>Does this load require specific equipment?</CardDescription>
            </CardHeader>
            <CardContent>
              <RadioGroup name="equipment_type" defaultValue="any" className="space-y-3">
                <div className="flex items-center space-x-3">
                  <RadioGroupItem value="any" id="equip_any" />
                  <Label htmlFor="equip_any">Any - No requirement</Label>
                </div>
                <div className="flex items-center space-x-3">
                  <RadioGroupItem value="box_truck" id="equip_box" />
                  <Label htmlFor="equip_box">Box Truck (26ft or smaller)</Label>
                </div>
                <div className="flex items-center space-x-3">
                  <RadioGroupItem value="semi_trailer" id="equip_semi" />
                  <Label htmlFor="equip_semi">Semi Trailer (53ft dry van)</Label>
                </div>
              </RadioGroup>
            </CardContent>
          </Card>

          {/* STEP 7: Visibility */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Posting Options
              </CardTitle>
              <CardDescription>How should carriers see this load?</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start space-x-3">
                <Checkbox id="push_to_partners" name="push_to_partners" defaultChecked />
                <div>
                  <Label htmlFor="push_to_partners">Send to my carrier partners</Label>
                  <p className="text-sm text-muted-foreground">
                    Partners get first notification of this load
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <Checkbox id="post_to_marketplace" name="post_to_marketplace" />
                <div>
                  <Label htmlFor="post_to_marketplace">Post to open marketplace</Label>
                  <p className="text-sm text-muted-foreground">
                    Any carrier can see and request this load
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

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
              These notes will be visible to carriers
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
      </main>
    </div>
  );
}
