'use client'

import { useActionState, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

import type { Company } from '@/data/companies'
import type { Driver } from '@/data/drivers'
import type { Truck, Trailer } from '@/data/fleet'
import type { Trip } from '@/data/trips'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'

const serviceTypeOptions = [
  { value: 'hhg_local', label: 'HHG Local' },
  { value: 'hhg_long_distance', label: 'HHG Long Distance' },
  { value: 'commercial', label: 'Commercial' },
  { value: 'storage_in', label: 'Storage In' },
  { value: 'storage_out', label: 'Storage Out' },
  { value: 'freight', label: 'Freight' },
  { value: 'other', label: 'Other' },
]

const loadOrderOptions = [
  { value: '1', label: '1st Load' },
  { value: '2', label: '2nd Load' },
  { value: '3', label: '3rd Load' },
  { value: '4', label: '4th Load' },
  { value: '5', label: '5th Load' },
  { value: '6', label: '6th Load' },
  { value: '7', label: '7th Load' },
  { value: '8', label: '8th Load' },
  { value: '9', label: '9th Load' },
  { value: '10', label: '10th Load' },
]

async function lookupZip(zip: string) {
  if (!zip || zip.length < 3) return { city: '', state: '' }
  try {
    const response = await fetch(`/api/zip-lookup?postal_code=${encodeURIComponent(zip)}&country=US`)
    if (!response.ok) return { city: '', state: '' }
    const data = await response.json()
    return { city: data.city || '', state: data.state || '' }
  } catch (error) {
    console.error('ZIP lookup error', error)
    return { city: '', state: '' }
  }
}

interface SelectWithHiddenInputProps {
  name: string
  options: { value: string; label: string }[]
  placeholder?: string
  required?: boolean
}

function SelectWithHiddenInput({ name, options, placeholder, required }: SelectWithHiddenInputProps) {
  const [value, setValue] = useState('')

  return (
    <div>
      <Select value={value || undefined} onValueChange={setValue} required={required}>
        <SelectTrigger className="h-9">
          <SelectValue placeholder={placeholder || 'None'} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <input type="hidden" name={name} value={value} />
    </div>
  )
}

function formatTripLabel(trip: Trip): string {
  const parts = [`Trip ${trip.trip_number}`]
  if (trip.origin_city && trip.destination_city) {
    parts.push(`${trip.origin_city} → ${trip.destination_city}`)
  }
  const driver = trip.driver as { first_name?: string; last_name?: string } | null
  if (driver?.first_name) {
    parts.push(`(${driver.first_name} ${driver.last_name || ''})`.trim())
  }
  return parts.join(' - ')
}

interface LoadCreateFormProps {
  companies: Company[]
  drivers: Driver[]
  trucks: Truck[]
  trailers: Trailer[]
  trips?: Trip[]
  onSubmit: (
    prevState: { errors?: Record<string, string>; success?: boolean; loadId?: string; tripId?: string } | null,
    formData: FormData
  ) => Promise<{ errors?: Record<string, string>; success?: boolean; loadId?: string; tripId?: string } | null>
}

export function LoadCreateForm({ companies, drivers, trucks, trailers, trips = [], onSubmit }: LoadCreateFormProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [state, formAction, pending] = useActionState(onSubmit, null)
  const [loadType, setLoadType] = useState<'company_load' | 'live_load'>('company_load')
  const [companyId, setCompanyId] = useState('')
  const [pickup, setPickup] = useState({ postalCode: '', city: '', state: '', address1: '', address2: '', contact: '', phone: '' })
  const [dropoff, setDropoff] = useState({ postalCode: '', city: '', state: '', address1: '', address2: '' })
  const [loadingContact, setLoadingContact] = useState({ name: '', phone: '', email: '', address1: '', address2: '', city: '', state: '', postalCode: '' })
  const [pricing, setPricing] = useState({ cubicFeet: '', rate: '' })
  const [selectedTripId, setSelectedTripId] = useState('')
  const [loadOrder, setLoadOrder] = useState('1')

  const selectedCompany = useMemo(() => companies.find((company) => company.id === companyId), [companies, companyId])

  useEffect(() => {
    if (!companyId && companies.length) {
      setCompanyId(companies[0].id)
    }
  }, [companyId, companies])

  useEffect(() => {
    const company = selectedCompany
    if (!company || loadType !== 'company_load') {
      return
    }
    setLoadingContact({
      name: company.dispatch_contact_name || company.primary_contact_name || '',
      phone: company.dispatch_contact_phone || company.primary_contact_phone || '',
      email: company.dispatch_contact_email || company.primary_contact_email || '',
      address1: company.dispatch_contact_street || company.street || '',
      address2: '',
      city: company.dispatch_contact_city || company.city || '',
      state: company.dispatch_contact_state || company.state || '',
      postalCode: company.dispatch_contact_postal_code || company.postal_code || '',
    })
  }, [selectedCompany, loadType])

  const linehaulAmount = (() => {
    const cubic = Number(pricing.cubicFeet)
    const rate = Number(pricing.rate)
    if (!Number.isFinite(cubic) || !Number.isFinite(rate)) {
      return 0
    }
    return Number((cubic * rate).toFixed(2))
  })()

  const handlePickupZip = async () => {
    if (!pickup.postalCode) return
    const { city, state } = await lookupZip(pickup.postalCode)
    setPickup((prev) => ({ ...prev, city: city || prev.city, state: state || prev.state }))
  }

  const handleDropoffZip = async () => {
    if (!dropoff.postalCode) return
    const { city, state } = await lookupZip(dropoff.postalCode)
    setDropoff((prev) => ({ ...prev, city: city || prev.city, state: state || prev.state }))
  }

  useEffect(() => {
    if (state?.success) {
      toast({
        title: 'Load saved',
        description: state.tripId
          ? 'The load was created and attached to the trip.'
          : 'The load was created successfully.',
      })
      // Redirect to trip detail page if a trip was selected, otherwise to loads list
      if (state.tripId) {
        router.push(`/dashboard/trips/${state.tripId}`)
      } else {
        router.push('/dashboard/loads')
      }
      router.refresh()
    }
  }, [state?.success, state?.tripId, router, toast])

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="load_type" value={loadType} />
      <input type="hidden" name="trip_id" value={selectedTripId} />
      <input type="hidden" name="load_order" value={loadOrder} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Load Type</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="inline-flex rounded-md border border-border bg-muted/40 p-1 text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
            <button
              type="button"
              className={cn(
                'px-4 py-2 rounded-md transition',
                loadType === 'company_load' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'
              )}
              onClick={() => setLoadType('company_load')}
            >
              Load from Company
            </button>
            <button
              type="button"
              className={cn(
                'px-4 py-2 rounded-md transition',
                loadType === 'live_load' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'
              )}
              onClick={() => setLoadType('live_load')}
            >
              Live Load
            </button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Identity & Assignment</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="job_number">Job Number</Label>
              <Input id="job_number" value="Assigned when saved" disabled className="bg-muted" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="load_number">Internal Reference</Label>
              <Input id="load_number" name="load_number" placeholder="Optional" />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="service_type">Service Type</Label>
              <SelectWithHiddenInput
                name="service_type"
                options={serviceTypeOptions}
                placeholder="Select type"
                required
              />
              {state?.errors?.service_type && (
                <p className="text-xs text-destructive">{state.errors.service_type}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="company_id">Company</Label>
              <div>
                <Select value={companyId || undefined} onValueChange={setCompanyId} required>
                  <SelectTrigger id="company_id" className="h-9">
                    <SelectValue placeholder="Select company" />
                  </SelectTrigger>
                  <SelectContent>
                    {companies.map((company) => (
                      <SelectItem key={company.id} value={company.id}>
                        {company.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <input type="hidden" name="company_id" value={companyId} />
              </div>
              {state?.errors?.company_id && (
                <p className="text-xs text-destructive">{state.errors.company_id}</p>
              )}
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <div className="space-y-1.5">
              <Label>Driver</Label>
              <SelectWithHiddenInput
                name="assigned_driver_id"
                options={drivers.map((driver) => ({ value: driver.id, label: `${driver.first_name} ${driver.last_name}` }))}
                placeholder="Unassigned"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Truck</Label>
              <SelectWithHiddenInput
                name="assigned_truck_id"
                options={trucks.map((truck) => ({
                  value: truck.id,
                  label: truck.unit_number ?? truck.plate_number ?? 'Unassigned',
                }))}
                placeholder="Unassigned"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Trailer</Label>
              <SelectWithHiddenInput
                name="assigned_trailer_id"
                options={trailers.map((trailer) => ({
                  value: trailer.id,
                  label: trailer.unit_number ?? 'Unassigned',
                }))}
                placeholder="Unassigned"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {loadType === 'live_load' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Pickup & On-site Contact</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Pickup ZIP</Label>
                <Input
                  name="pickup_postal_code"
                  value={pickup.postalCode}
                  onChange={(event) => setPickup((prev) => ({ ...prev, postalCode: event.target.value }))}
                  onBlur={handlePickupZip}
                  required={loadType === 'live_load'}
                />
                {state?.errors?.pickup_postal_code && (
                  <p className="text-xs text-destructive">{state.errors.pickup_postal_code}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>Pickup Address</Label>
                <Input
                  name="pickup_address_line1"
                  value={pickup.address1}
                  onChange={(event) => setPickup((prev) => ({ ...prev, address1: event.target.value }))}
                  required={loadType === 'live_load'}
                />
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-1.5">
                <Label>City</Label>
                <Input
                  name="pickup_city"
                  value={pickup.city}
                  onChange={(event) => setPickup((prev) => ({ ...prev, city: event.target.value }))}
                  required={loadType === 'live_load'}
                />
              </div>
              <div className="space-y-1.5">
                <Label>State</Label>
                <Input
                  name="pickup_state"
                  value={pickup.state}
                  onChange={(event) => setPickup((prev) => ({ ...prev, state: event.target.value }))}
                  required={loadType === 'live_load'}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Contact Name</Label>
                <Input
                  name="pickup_contact_name"
                  value={pickup.contact}
                  onChange={(event) => setPickup((prev) => ({ ...prev, contact: event.target.value }))}
                  required={loadType === 'live_load'}
                />
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Contact Phone</Label>
                <Input
                  name="pickup_contact_phone"
                  value={pickup.phone}
                  onChange={(event) => setPickup((prev) => ({ ...prev, phone: event.target.value }))}
                  required={loadType === 'live_load'}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Address Line 2</Label>
                <Input
                  name="pickup_address_line2"
                  value={pickup.address2}
                  onChange={(event) => setPickup((prev) => ({ ...prev, address2: event.target.value }))}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Dropoff</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Dropoff ZIP</Label>
              <Input
                name="dropoff_postal_code"
                value={dropoff.postalCode}
                onChange={(event) => setDropoff((prev) => ({ ...prev, postalCode: event.target.value }))}
                onBlur={handleDropoffZip}
                required
              />
              {state?.errors?.dropoff_postal_code && (
                <p className="text-xs text-destructive">{state.errors.dropoff_postal_code}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Address Line 1</Label>
              <Input
                name="dropoff_address_line1"
                value={dropoff.address1}
                onChange={(event) => setDropoff((prev) => ({ ...prev, address1: event.target.value }))}
              />
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-1.5">
              <Label>City</Label>
              <Input
                name="dropoff_city"
                value={dropoff.city}
                onChange={(event) => setDropoff((prev) => ({ ...prev, city: event.target.value }))}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label>State</Label>
              <Input
                name="dropoff_state"
                value={dropoff.state}
                onChange={(event) => setDropoff((prev) => ({ ...prev, state: event.target.value }))}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label>Address Line 2</Label>
              <Input
                name="dropoff_address_line2"
                value={dropoff.address2}
                onChange={(event) => setDropoff((prev) => ({ ...prev, address2: event.target.value }))}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {loadType === 'company_load' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Warehouse Contact Snapshot</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Contact Name</Label>
                <Input
                  name="loading_contact_name"
                  value={loadingContact.name}
                  onChange={(event) => setLoadingContact((prev) => ({ ...prev, name: event.target.value }))}
                  required={loadType === 'company_load'}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Contact Phone</Label>
                <Input
                  name="loading_contact_phone"
                  value={loadingContact.phone}
                  onChange={(event) => setLoadingContact((prev) => ({ ...prev, phone: event.target.value }))}
                  required={loadType === 'company_load'}
                />
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input
                  name="loading_contact_email"
                  type="email"
                  value={loadingContact.email}
                  onChange={(event) => setLoadingContact((prev) => ({ ...prev, email: event.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Address Line 1</Label>
                <Input
                  name="loading_address_line1"
                  value={loadingContact.address1}
                  onChange={(event) => setLoadingContact((prev) => ({ ...prev, address1: event.target.value }))}
                  required={loadType === 'company_load'}
                />
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-1.5">
                <Label>Address Line 2</Label>
                <Input
                  name="loading_address_line2"
                  value={loadingContact.address2}
                  onChange={(event) => setLoadingContact((prev) => ({ ...prev, address2: event.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>City</Label>
                <Input
                  name="loading_city"
                  value={loadingContact.city}
                  onChange={(event) => setLoadingContact((prev) => ({ ...prev, city: event.target.value }))}
                  required={loadType === 'company_load'}
                />
              </div>
              <div className="space-y-1.5">
                <Label>State</Label>
                <Input
                  name="loading_state"
                  value={loadingContact.state}
                  onChange={(event) => setLoadingContact((prev) => ({ ...prev, state: event.target.value }))}
                  required={loadType === 'company_load'}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Postal Code</Label>
              <Input
                name="loading_postal_code"
                value={loadingContact.postalCode}
                onChange={(event) => setLoadingContact((prev) => ({ ...prev, postalCode: event.target.value }))}
                required={loadType === 'company_load'}
              />
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Pricing</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Cubic Feet</Label>
              <Input
                name="cubic_feet"
                type="number"
                min="1"
                value={pricing.cubicFeet}
                onChange={(event) => setPricing((prev) => ({ ...prev, cubicFeet: event.target.value }))}
                required
              />
              {state?.errors?.cubic_feet && (
                <p className="text-xs text-destructive">{state.errors.cubic_feet}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Rate per CuFt</Label>
              <Input
                name="rate_per_cuft"
                type="number"
                step="0.01"
                min="0"
                value={pricing.rate}
                onChange={(event) => setPricing((prev) => ({ ...prev, rate: event.target.value }))}
                required
              />
              {state?.errors?.rate_per_cuft && (
                <p className="text-xs text-destructive">{state.errors.rate_per_cuft}</p>
              )}
            </div>
          </div>
          <div className="rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm">
            <p className="text-muted-foreground">Linehaul Amount</p>
            <p className="text-2xl font-semibold">${linehaulAmount.toFixed(2)}</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" name="notes" rows={3} placeholder="Driver-facing notes" />
          </div>
        </CardContent>
      </Card>

      {/* OPTIONAL TRIP ASSIGNMENT */}
      {trips.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold text-muted-foreground">
              Assign to Trip (optional)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>Trip</Label>
              <Select
                value={selectedTripId || undefined}
                onValueChange={(value) => {
                  setSelectedTripId(value === 'none' ? '' : value)
                  if (value === 'none' || !value) {
                    setLoadOrder('1')
                  }
                }}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Select a trip (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No trip - create unassigned</SelectItem>
                  {trips.map((trip) => (
                    <SelectItem key={trip.id} value={trip.id}>
                      {formatTripLabel(trip)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Leave blank to create an unassigned load
              </p>
            </div>

            {selectedTripId && (
              <div className="space-y-1.5">
                <Label>Loading Order</Label>
                <Select value={loadOrder} onValueChange={setLoadOrder}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {loadOrderOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Which load is this on the trailer? (1st = loaded first)
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {state?.errors?._form && (
        <Card className="border-destructive bg-destructive/10">
          <CardContent className="py-4 text-sm text-destructive">{state.errors._form}</CardContent>
        </Card>
      )}

      <div className="flex items-center justify-end gap-3">
        <Link href="/dashboard/loads" className="text-sm text-muted-foreground hover:text-foreground">
          Cancel
        </Link>
        <Button type="submit" disabled={pending} className="px-6">
          {pending ? 'Saving...' : 'Create Load'}
        </Button>
      </div>
    </form>
  )
}
