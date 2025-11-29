'use client';

import Link from 'next/link';
import { useCallback } from 'react';
import { LocationType, StorageLocation, TruckAccessibility } from '@/data/storage-locations';
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
import { DatePicker } from '@/components/ui/date-picker';
import { useZipLookup } from '@/hooks/useZipLookup';

interface StorageLocationFormProps {
  action: (formData: FormData) => Promise<void>;
  locationType: LocationType;
  submitLabel: string;
  initialData?: Partial<StorageLocation>;
}

export function StorageLocationForm({
  action,
  locationType,
  submitLabel,
  initialData,
}: StorageLocationFormProps) {
  const isWarehouse = locationType === 'warehouse';
  const isPublicStorage = locationType === 'public_storage';
  const { lookup } = useZipLookup();

  const handleZipBlur = useCallback(
    async (e: React.FocusEvent<HTMLInputElement>) => {
      const zipValue = e.target.value;
      const cleanZip = zipValue.replace(/\D/g, '');

      if (cleanZip.length === 5) {
        const result = await lookup(cleanZip);
        if (result) {
          const form = e.target.form;
          if (form) {
            const cityInput = form.elements.namedItem('city') as HTMLInputElement;
            const stateInput = form.elements.namedItem('state') as HTMLInputElement;

            if (cityInput && !cityInput.value) {
              cityInput.value = result.city;
            }
            if (stateInput && !stateInput.value) {
              stateInput.value = result.stateAbbr;
            }
          }
        }
      }
    },
    [lookup]
  );

  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="location_type" value={locationType} />

      {/* Basic Info & Address */}
      <section className="space-y-4">
        <h3 className="text-sm font-medium text-muted-foreground">Location Details</h3>

        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2">
            <Label htmlFor="name">Location Name *</Label>
            <Input
              id="name"
              name="name"
              placeholder={isWarehouse ? 'ABC Warehouse Chicago' : 'CubeSmart - Oak Park'}
              defaultValue={initialData?.name || ''}
              required
            />
          </div>
          <div>
            <Label htmlFor="code">Code</Label>
            <Input
              id="code"
              name="code"
              placeholder={isWarehouse ? 'CHI-1' : 'CS-OP-1'}
              defaultValue={initialData?.code || ''}
            />
          </div>
        </div>

        {isPublicStorage && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="facility_brand">Facility Brand</Label>
              <Select name="facility_brand" defaultValue={initialData?.facility_brand || ''}>
                <SelectTrigger>
                  <SelectValue placeholder="Select brand" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cubesmart">CubeSmart</SelectItem>
                  <SelectItem value="public_storage">Public Storage</SelectItem>
                  <SelectItem value="extra_space">Extra Space Storage</SelectItem>
                  <SelectItem value="life_storage">Life Storage</SelectItem>
                  <SelectItem value="uhaul">U-Haul</SelectItem>
                  <SelectItem value="storquest">StorQuest</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="facility_phone">Facility Phone</Label>
              <Input
                id="facility_phone"
                name="facility_phone"
                placeholder="800-555-1234"
                defaultValue={initialData?.facility_phone || ''}
              />
            </div>
          </div>
        )}

        <div>
          <Label htmlFor="address_line1">Street Address *</Label>
          <Input
            id="address_line1"
            name="address_line1"
            placeholder="1234 Industrial Blvd"
            defaultValue={initialData?.address_line1 || ''}
            required
          />
        </div>

        <div className="grid grid-cols-4 gap-4">
          <div>
            <Label htmlFor="address_line2">Suite/Unit</Label>
            <Input
              id="address_line2"
              name="address_line2"
              placeholder={isWarehouse ? 'Bay 12' : '#100'}
              defaultValue={initialData?.address_line2 || ''}
            />
          </div>
          <div>
            <Label htmlFor="zip">ZIP *</Label>
            <Input
              id="zip"
              name="zip"
              defaultValue={initialData?.zip}
              onBlur={handleZipBlur}
              placeholder="60601"
              required
            />
          </div>
          <div>
            <Label htmlFor="city">City *</Label>
            <Input id="city" name="city" defaultValue={initialData?.city} placeholder="Chicago" required />
          </div>
          <div>
            <Label htmlFor="state">State *</Label>
            <Input
              id="state"
              name="state"
              placeholder="IL"
              maxLength={2}
              defaultValue={initialData?.state}
              required
            />
          </div>
        </div>
      </section>

      <hr className="border-border" />

      {/* Account Info (Public Storage) or Warehouse Details */}
      {isPublicStorage && (
        <>
          <section className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground">Account Information</h3>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="account_name">Account Name</Label>
                <Input
                  id="account_name"
                  name="account_name"
                  placeholder="MoveBoss LLC"
                  defaultValue={initialData?.account_name || ''}
                />
              </div>
              <div>
                <Label htmlFor="account_number">Account #</Label>
                <Input
                  id="account_number"
                  name="account_number"
                  placeholder="ACC-12345"
                  defaultValue={initialData?.account_number || ''}
                />
              </div>
              <div>
                <Label htmlFor="unit_numbers">Unit Numbers</Label>
                <Input
                  id="unit_numbers"
                  name="unit_numbers"
                  placeholder="101, 102"
                  defaultValue={initialData?.unit_numbers || ''}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="authorization_notes">Authorization Notes</Label>
              <Textarea
                id="authorization_notes"
                name="authorization_notes"
                placeholder="Driver must show company ID. Manager authorization required for after-hours access."
                rows={2}
                defaultValue={initialData?.authorization_notes || ''}
              />
            </div>
          </section>

          <hr className="border-border" />
        </>
      )}

      {isWarehouse && (
        <>
          <section className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground">Warehouse Details</h3>

            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2">
                <Label htmlFor="operating_hours">Operating Hours</Label>
                <Input
                  id="operating_hours"
                  name="operating_hours"
                  placeholder="Mon-Fri 6am-6pm, Sat 8am-12pm"
                  defaultValue={initialData?.operating_hours || ''}
                />
              </div>
              <div>
                <Label htmlFor="dock_height">Dock Height</Label>
                <Input
                  id="dock_height"
                  name="dock_height"
                  placeholder="48 inches"
                  defaultValue={initialData?.dock_height || ''}
                />
              </div>
            </div>

            <div className="flex gap-6">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="has_loading_dock"
                  name="has_loading_dock"
                  defaultChecked={initialData?.has_loading_dock || false}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <Label htmlFor="has_loading_dock" className="font-normal">Has Loading Dock</Label>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="appointment_required"
                  name="appointment_required"
                  defaultChecked={initialData?.appointment_required || false}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <Label htmlFor="appointment_required" className="font-normal">Appointment Required</Label>
              </div>
            </div>

            <div>
              <Label htmlFor="appointment_instructions">Appointment Instructions</Label>
              <Textarea
                id="appointment_instructions"
                name="appointment_instructions"
                placeholder="Call 24hrs in advance. Schedule through office manager."
                rows={2}
                defaultValue={initialData?.appointment_instructions || ''}
              />
            </div>
          </section>

          <hr className="border-border" />
        </>
      )}

      {/* Contact & Access */}
      <section className="space-y-4">
        <h3 className="text-sm font-medium text-muted-foreground">Contact & Access</h3>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <Label htmlFor="contact_name">Contact Name</Label>
            <Input
              id="contact_name"
              name="contact_name"
              placeholder={isPublicStorage ? 'Your contact' : 'Mike'}
              defaultValue={initialData?.contact_name || ''}
            />
          </div>
          <div>
            <Label htmlFor="contact_phone">Contact Phone</Label>
            <Input
              id="contact_phone"
              name="contact_phone"
              placeholder="312-555-1234"
              defaultValue={initialData?.contact_phone || ''}
            />
          </div>
          <div>
            <Label htmlFor="contact_email">Contact Email</Label>
            <Input
              id="contact_email"
              name="contact_email"
              type="email"
              defaultValue={initialData?.contact_email || ''}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="access_hours">Access Hours</Label>
            <Input
              id="access_hours"
              name="access_hours"
              placeholder={isPublicStorage ? '6am-9pm daily' : 'Mon-Fri 8am-5pm'}
              defaultValue={initialData?.access_hours || ''}
            />
          </div>
          <div>
            <Label htmlFor="gate_code">{isPublicStorage ? 'Gate/Access Code' : 'Gate Code'}</Label>
            <Input
              id="gate_code"
              name="gate_code"
              placeholder="1234#"
              defaultValue={initialData?.gate_code || ''}
            />
          </div>
        </div>

        <div>
          <Label htmlFor="access_instructions">Access Instructions</Label>
          <Textarea
            id="access_instructions"
            name="access_instructions"
            placeholder={
              isPublicStorage
                ? 'Enter gate code, go to building B, take elevator to 2nd floor'
                : 'Enter through back gate, check in at office first'
            }
            rows={2}
            defaultValue={initialData?.access_instructions || ''}
          />
        </div>
      </section>

      <hr className="border-border" />

      {/* Truck Access & Notes */}
      <section className="space-y-4">
        <h3 className="text-sm font-medium text-muted-foreground">Truck Access</h3>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="truck_accessibility">Accessibility Level *</Label>
            <Select
              name="truck_accessibility"
              defaultValue={initialData?.truck_accessibility || 'full'}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select accessibility" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="full">Full - 53&apos; trailer access</SelectItem>
                <SelectItem value="limited">Limited - Box truck only</SelectItem>
                <SelectItem value="none">None - Hand-carry only</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="special_notes">Special Notes</Label>
            <Input
              id="special_notes"
              name="special_notes"
              placeholder="No overnight parking"
              defaultValue={initialData?.special_notes || ''}
            />
          </div>
        </div>

        <div>
          <Label htmlFor="accessibility_notes">Accessibility Notes</Label>
          <Textarea
            id="accessibility_notes"
            name="accessibility_notes"
            placeholder={
              isPublicStorage
                ? 'Elevator required for upper floors. Cart available at front desk.'
                : 'Loading dock on east side. No overnight parking.'
            }
            rows={2}
            defaultValue={initialData?.accessibility_notes || ''}
          />
        </div>
      </section>

      <hr className="border-border" />

      {/* Rental & Payment */}
      <section className="space-y-4">
        <h3 className="text-sm font-medium text-muted-foreground">Rental & Payment Tracking</h3>

        <div className="grid grid-cols-4 gap-4">
          <div>
            <Label htmlFor="monthly_rent">Monthly Rent ($)</Label>
            <Input
              id="monthly_rent"
              name="monthly_rent"
              type="number"
              step="0.01"
              placeholder="500.00"
              defaultValue={initialData?.monthly_rent?.toString() || ''}
            />
          </div>
          <div>
            <Label htmlFor="rent_due_day">Due Day</Label>
            <Select
              name="rent_due_day"
              defaultValue={initialData?.rent_due_day?.toString() || ''}
            >
              <SelectTrigger>
                <SelectValue placeholder="Day" />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                  <SelectItem key={day} value={day.toString()}>
                    {day === 1 ? '1st' : day === 2 ? '2nd' : day === 3 ? '3rd' : day === 21 ? '21st' : day === 22 ? '22nd' : day === 23 ? '23rd' : day === 31 ? '31st' : `${day}th`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="next_payment_due">Next Payment Due</Label>
            <DatePicker
              name="next_payment_due"
              defaultValue={initialData?.next_payment_due || undefined}
              placeholder="Select date"
              className="h-10"
            />
          </div>
          <div>
            <Label htmlFor="alert_days_before">Alert Before</Label>
            <Select
              name="alert_days_before"
              defaultValue={initialData?.alert_days_before?.toString() || '7'}
            >
              <SelectTrigger>
                <SelectValue placeholder="Days" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="3">3 days</SelectItem>
                <SelectItem value="5">5 days</SelectItem>
                <SelectItem value="7">7 days</SelectItem>
                <SelectItem value="14">14 days</SelectItem>
                <SelectItem value="30">30 days</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="track_payments"
            name="track_payments"
            defaultChecked={initialData?.track_payments || false}
            className="h-4 w-4 rounded border-gray-300"
          />
          <Label htmlFor="track_payments" className="font-normal">
            Track payment due dates and show alerts on dashboard
          </Label>
        </div>
      </section>

      {/* Submit */}
      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button type="button" variant="outline" asChild>
          <Link href="/dashboard/storage">Cancel</Link>
        </Button>
        <Button type="submit">
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
