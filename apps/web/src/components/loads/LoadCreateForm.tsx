'use client'

import { useActionState, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Plus, Warehouse, X, Building2, User } from 'lucide-react'

import type { Company } from '@/data/companies'
import type { Driver } from '@/data/drivers'
import type { Truck, Trailer } from '@/data/fleet'
import type { Trip } from '@/data/trips'
import type { StorageLocation, LocationType } from '@/data/storage-locations'
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'
import { useSetupProgress } from '@/hooks/use-setup-progress'

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
  storageLocations?: StorageLocation[]
  onCreateStorageLocation?: (data: Partial<StorageLocation>) => Promise<{ success: boolean; id?: string; error?: string }>
  onSubmit: (
    prevState: { errors?: Record<string, string>; success?: boolean; loadId?: string; tripId?: string } | null,
    formData: FormData
  ) => Promise<{ errors?: Record<string, string>; success?: boolean; loadId?: string; tripId?: string } | null>
}

export function LoadCreateForm({
  companies,
  drivers,
  trucks,
  trailers,
  trips = [],
  storageLocations = [],
  onCreateStorageLocation,
  onSubmit
}: LoadCreateFormProps) {
  const router = useRouter()
  const { toast } = useToast()
  const { markComplete } = useSetupProgress()
  const [state, formAction, pending] = useActionState(onSubmit, null)
  const [loadSource, setLoadSource] = useState<'own_customer' | 'partner'>('partner')
  const [loadType, setLoadType] = useState<'company_load' | 'live_load'>('company_load')
  const [companyId, setCompanyId] = useState('')
  const [pickup, setPickup] = useState({ postalCode: '', city: '', state: '', address1: '', address2: '', contact: '', phone: '' })
  const [dropoff, setDropoff] = useState({ postalCode: '', city: '', state: '', address1: '', address2: '' })
  const [loadingContact, setLoadingContact] = useState({ name: '', phone: '', email: '', address1: '', address2: '', city: '', state: '', postalCode: '' })
  const [pricing, setPricing] = useState({ cubicFeet: '', rate: '', balanceDue: '' })
  const [customer, setCustomer] = useState({ name: '', phone: '', deliveryZip: '', deliveryCity: '', deliveryState: '', deliveryAddress1: '', deliveryAddress2: '' })
  const [selectedTripId, setSelectedTripId] = useState('')
  const [loadOrder, setLoadOrder] = useState('1')

  // Storage location state
  const [storageLocationId, setStorageLocationId] = useState('')
  const [storageUnit, setStorageUnit] = useState('')
  const [showAddLocationModal, setShowAddLocationModal] = useState(false)
  const [newLocationSaving, setNewLocationSaving] = useState(false)
  const [localStorageLocations, setLocalStorageLocations] = useState<StorageLocation[]>(storageLocations)
  const [newLocation, setNewLocation] = useState<{
    name: string;
    location_type: LocationType;
    address_line1: string;
    city: string;
    state: string;
    zip: string;
    contact_name: string;
    contact_phone: string;
    gate_code: string;
  }>({
    name: '',
    location_type: 'warehouse',
    address_line1: '',
    city: '',
    state: '',
    zip: '',
    contact_name: '',
    contact_phone: '',
    gate_code: '',
  })

  const selectedCompany = useMemo(() => companies.find((company) => company.id === companyId), [companies, companyId])

  // Auto-select first company only for partner loads
  useEffect(() => {
    if (loadSource === 'partner' && !companyId && companies.length) {
      setCompanyId(companies[0].id)
    }
    // Clear company selection when switching to own_customer
    if (loadSource === 'own_customer' && companyId) {
      setCompanyId('')
    }
  }, [loadSource, companyId, companies])

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

  const handleNewLocationZip = async () => {
    if (!newLocation.zip) return
    const { city, state } = await lookupZip(newLocation.zip)
    setNewLocation((prev) => ({ ...prev, city: city || prev.city, state: state || prev.state }))
  }

  const handleDeliveryZip = async () => {
    if (!customer.deliveryZip) return
    const { city, state } = await lookupZip(customer.deliveryZip)
    setCustomer((prev) => ({ ...prev, deliveryCity: city || prev.deliveryCity, deliveryState: state || prev.deliveryState }))
  }

  const handleCreateStorageLocation = async () => {
    if (!onCreateStorageLocation) return
    if (!newLocation.name || !newLocation.city || !newLocation.state || !newLocation.zip) {
      toast({
        title: 'Missing fields',
        description: 'Please fill in all required fields for the storage location.',
        variant: 'destructive',
      })
      return
    }

    setNewLocationSaving(true)
    try {
      const result = await onCreateStorageLocation(newLocation)
      if (result.success && result.id) {
        // Add the new location to the local list
        const createdLocation: StorageLocation = {
          id: result.id,
          company_id: null,
          owner_id: '',
          name: newLocation.name,
          code: null,
          location_type: newLocation.location_type,
          address_line1: newLocation.address_line1,
          address_line2: null,
          city: newLocation.city,
          state: newLocation.state,
          zip: newLocation.zip,
          country: 'USA',
          latitude: null,
          longitude: null,
          contact_name: newLocation.contact_name || null,
          contact_phone: newLocation.contact_phone || null,
          contact_email: null,
          access_hours: null,
          access_instructions: null,
          special_notes: null,
          gate_code: newLocation.gate_code || null,
          total_capacity_cuft: null,
          current_usage_cuft: null,
          monthly_rent: null,
          rent_due_day: null,
          lease_start_date: null,
          lease_end_date: null,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          // Warehouse-specific fields
          operating_hours: null,
          has_loading_dock: false,
          dock_height: null,
          appointment_required: false,
          appointment_instructions: null,
          // Public Storage-specific fields
          facility_brand: null,
          facility_phone: null,
          unit_numbers: null,
          account_name: null,
          account_number: null,
          authorization_notes: null,
          // Accessibility
          truck_accessibility: 'full',
          accessibility_notes: null,
          // Payment tracking
          track_payments: false,
          alert_days_before: 7,
          next_payment_due: null,
          vacated_at: null,
        }
        setLocalStorageLocations((prev) => [...prev, createdLocation])
        setStorageLocationId(result.id)
        setShowAddLocationModal(false)
        setNewLocation({
          name: '',
          location_type: 'warehouse',
          address_line1: '',
          city: '',
          state: '',
          zip: '',
          contact_name: '',
          contact_phone: '',
          gate_code: '',
        })
        toast({
          title: 'Location created',
          description: `${newLocation.name} has been added and selected.`,
        })
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to create storage location.',
          variant: 'destructive',
        })
      }
    } catch {
      toast({
        title: 'Error',
        description: 'An unexpected error occurred.',
        variant: 'destructive',
      })
    } finally {
      setNewLocationSaving(false)
    }
  }

  useEffect(() => {
    if (state?.success) {
      // Mark setup progress for first load
      markComplete('first_load_created')
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
  }, [state?.success, state?.tripId, router, toast, markComplete])

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="load_type" value={loadType} />
      <input type="hidden" name="load_source" value={loadSource} />
      {/* Load flow type: "My Customer" = hhg_originated, "From Company" = carrier_intake */}
      <input type="hidden" name="load_flow_type" value={loadSource === 'own_customer' ? 'hhg_originated' : 'carrier_intake'} />
      <input type="hidden" name="trip_id" value={selectedTripId} />
      <input type="hidden" name="load_order" value={loadOrder} />

      {/* Load Source Selection - Card Style */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Partner Load - First */}
        <button
          type="button"
          onClick={() => setLoadSource('partner')}
          className={cn(
            'relative flex flex-col items-start p-5 rounded-xl border-2 text-left transition-all',
            loadSource === 'partner'
              ? 'border-primary bg-primary/5 shadow-sm'
              : 'border-border hover:border-primary/50 hover:bg-muted/50'
          )}
        >
          <div className={cn(
            'flex items-center justify-center w-10 h-10 rounded-lg mb-3',
            loadSource === 'partner' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
          )}>
            <Building2 className="h-5 w-5" />
          </div>
          <h3 className="font-semibold text-foreground mb-1">Partner Load</h3>
          <p className="text-sm text-muted-foreground">
            Hauling for another company (contract work)
          </p>
          {loadSource === 'partner' && (
            <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
              <svg className="w-3 h-3 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
          )}
        </button>

        {/* My Customer - Second */}
        <button
          type="button"
          onClick={() => setLoadSource('own_customer')}
          className={cn(
            'relative flex flex-col items-start p-5 rounded-xl border-2 text-left transition-all',
            loadSource === 'own_customer'
              ? 'border-primary bg-primary/5 shadow-sm'
              : 'border-border hover:border-primary/50 hover:bg-muted/50'
          )}
        >
          <div className={cn(
            'flex items-center justify-center w-10 h-10 rounded-lg mb-3',
            loadSource === 'own_customer' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
          )}>
            <User className="h-5 w-5" />
          </div>
          <h3 className="font-semibold text-foreground mb-1">My Customer</h3>
          <p className="text-sm text-muted-foreground">
            Direct customer job - you have their info
          </p>
          {loadSource === 'own_customer' && (
            <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
              <svg className="w-3 h-3 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
          )}
        </button>
      </div>

      {/* Load Type Toggle - only for partner loads */}
      {loadSource === 'partner' && (
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
                Load from Warehouse
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
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Identity & Assignment</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="load_number">Load Number</Label>
              <Input id="load_number" value="Auto-generated (LD-XXXXXX)" disabled className="bg-muted" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="internal_reference">Internal Reference</Label>
              <Input id="internal_reference" name="internal_reference" placeholder="Your CRM # (optional)" />
            </div>
          </div>

          <div className={cn("grid gap-4", loadSource === 'partner' ? "md:grid-cols-2" : "md:grid-cols-1")}>
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
            {/* Partner Company dropdown - only for partner loads */}
            {loadSource === 'partner' && (
              <div className="space-y-1.5">
                <Label htmlFor="company_id">
                  Partner Company <span className="text-destructive">*</span>
                </Label>
                <div>
                  <Select value={companyId || undefined} onValueChange={setCompanyId} required>
                    <SelectTrigger id="company_id" className="h-9">
                      <SelectValue placeholder="Select partner company" />
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
            )}
          </div>

          {/* DRIVER ASSIGNMENT RULE UPDATE: Driver and equipment assignment removed from load forms.
              Drivers are assigned via trips - see syncTripDriverToLoads().
              Equipment is assigned via trips - see syncTripEquipmentToLoads().
              When creating a load, assign it to a trip to automatically inherit driver/equipment. */}
          <div className="p-3 bg-muted/50 rounded-lg">
            <p className="text-sm text-muted-foreground">
              Driver and equipment will be assigned when you add this load to a trip.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Customer Details - only for own_customer */}
      {loadSource === 'own_customer' && (
        <Card className="border-green-500/30">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Customer Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Customer Name <span className="text-destructive">*</span></Label>
                <Input
                  name="customer_name"
                  value={customer.name}
                  onChange={(e) => setCustomer((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="John Smith"
                  required={loadSource === 'own_customer'}
                />
                {state?.errors?.customer_name && (
                  <p className="text-xs text-destructive">{state.errors.customer_name}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>Customer Phone <span className="text-destructive">*</span></Label>
                <Input
                  name="customer_phone"
                  value={customer.phone}
                  onChange={(e) => setCustomer((prev) => ({ ...prev, phone: e.target.value }))}
                  placeholder="555-123-4567"
                  required={loadSource === 'own_customer'}
                />
                {state?.errors?.customer_phone && (
                  <p className="text-xs text-destructive">{state.errors.customer_phone}</p>
                )}
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-6">
              <div className="md:col-span-2 space-y-1.5">
                <Label>Delivery ZIP <span className="text-destructive">*</span></Label>
                <Input
                  name="delivery_postal_code"
                  value={customer.deliveryZip}
                  onChange={(e) => setCustomer((prev) => ({ ...prev, deliveryZip: e.target.value }))}
                  onBlur={handleDeliveryZip}
                  placeholder="60601"
                  required={loadSource === 'own_customer'}
                />
                {state?.errors?.delivery_postal_code && (
                  <p className="text-xs text-destructive">{state.errors.delivery_postal_code}</p>
                )}
              </div>
              <div className="md:col-span-3 space-y-1.5">
                <Label>City <span className="text-destructive">*</span></Label>
                <Input
                  name="delivery_city"
                  value={customer.deliveryCity}
                  onChange={(e) => setCustomer((prev) => ({ ...prev, deliveryCity: e.target.value }))}
                  placeholder="Chicago"
                  required={loadSource === 'own_customer'}
                />
                {state?.errors?.delivery_city && (
                  <p className="text-xs text-destructive">{state.errors.delivery_city}</p>
                )}
              </div>
              <div className="md:col-span-1 space-y-1.5">
                <Label>State <span className="text-destructive">*</span></Label>
                <Input
                  name="delivery_state"
                  value={customer.deliveryState}
                  onChange={(e) => setCustomer((prev) => ({ ...prev, deliveryState: e.target.value }))}
                  placeholder="IL"
                  maxLength={2}
                  required={loadSource === 'own_customer'}
                />
                {state?.errors?.delivery_state && (
                  <p className="text-xs text-destructive">{state.errors.delivery_state}</p>
                )}
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Address Line 1 <span className="text-destructive">*</span></Label>
                <Input
                  name="delivery_address_line1"
                  value={customer.deliveryAddress1}
                  onChange={(e) => setCustomer((prev) => ({ ...prev, deliveryAddress1: e.target.value }))}
                  placeholder="123 Main Street"
                  required={loadSource === 'own_customer'}
                />
                {state?.errors?.delivery_address_line1 && (
                  <p className="text-xs text-destructive">{state.errors.delivery_address_line1}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>Address Line 2</Label>
                <Input
                  name="delivery_address_line2"
                  value={customer.deliveryAddress2}
                  onChange={(e) => setCustomer((prev) => ({ ...prev, deliveryAddress2: e.target.value }))}
                  placeholder="Apt 4B, Suite 100, etc."
                />
              </div>
            </div>
            {/* Hidden field for delivery_address_full - combines address fields for validation */}
            <input
              type="hidden"
              name="delivery_address_full"
              value={[
                customer.deliveryAddress1,
                customer.deliveryAddress2,
                customer.deliveryCity,
                customer.deliveryState,
                customer.deliveryZip
              ].filter(Boolean).join(', ')}
            />
            {state?.errors?.delivery_address_full && (
              <p className="text-xs text-destructive">{state.errors.delivery_address_full}</p>
            )}
          </CardContent>
        </Card>
      )}

      {loadSource === 'partner' && loadType === 'live_load' && (
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

      {/* Destination - only for partner loads (own_customer has full address in customer details) */}
      {loadSource === 'partner' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Destination</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-xs text-muted-foreground">
              Driver will get full address from loading report. Enter destination city/state for routing.
            </p>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-1.5">
                <Label>Destination ZIP <span className="text-destructive">*</span></Label>
                <Input
                  name="dropoff_postal_code"
                  value={dropoff.postalCode}
                  onChange={(event) => setDropoff((prev) => ({ ...prev, postalCode: event.target.value }))}
                  onBlur={handleDropoffZip}
                  required={loadSource === 'partner'}
                />
                {state?.errors?.dropoff_postal_code && (
                  <p className="text-xs text-destructive">{state.errors.dropoff_postal_code}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>City <span className="text-destructive">*</span></Label>
                <Input
                  name="dropoff_city"
                  value={dropoff.city}
                  onChange={(event) => setDropoff((prev) => ({ ...prev, city: event.target.value }))}
                  required={loadSource === 'partner'}
                />
              </div>
              <div className="space-y-1.5">
                <Label>State <span className="text-destructive">*</span></Label>
                <Input
                  name="dropoff_state"
                  value={dropoff.state}
                  onChange={(event) => setDropoff((prev) => ({ ...prev, state: event.target.value }))}
                  required={loadSource === 'partner'}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {loadSource === 'partner' && loadType === 'company_load' && (
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
              <Label>
                Cubic Feet {loadSource === 'own_customer' ? '(Estimate)' : ''}
                {loadSource === 'partner' && <span className="text-destructive"> *</span>}
              </Label>
              <Input
                name="cubic_feet"
                type="number"
                min="1"
                value={pricing.cubicFeet}
                onChange={(event) => setPricing((prev) => ({ ...prev, cubicFeet: event.target.value }))}
                required={loadSource === 'partner'}
              />
              {state?.errors?.cubic_feet && (
                <p className="text-xs text-destructive">{state.errors.cubic_feet}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>
                Rate per CuFt
                {loadSource === 'partner' && <span className="text-destructive"> *</span>}
              </Label>
              <Input
                name="rate_per_cuft"
                type="number"
                step="0.01"
                min="0"
                value={pricing.rate}
                onChange={(event) => setPricing((prev) => ({ ...prev, rate: event.target.value }))}
                required={loadSource === 'partner'}
                placeholder={loadSource === 'own_customer' ? 'Optional' : ''}
              />
              <p className="text-xs text-muted-foreground">
                {loadSource === 'partner' ? "Carrier's revenue rate" : 'For profitability tracking'}
              </p>
              {state?.errors?.rate_per_cuft && (
                <p className="text-xs text-destructive">{state.errors.rate_per_cuft}</p>
              )}
            </div>
          </div>

          {/* Balance Due - only for own_customer */}
          {loadSource === 'own_customer' && (
            <div className="space-y-1.5">
              <Label>Balance Due on Delivery <span className="text-destructive">*</span></Label>
              <Input
                name="balance_due"
                type="number"
                step="0.01"
                min="0"
                value={pricing.balanceDue}
                onChange={(event) => setPricing((prev) => ({ ...prev, balanceDue: event.target.value }))}
                placeholder="0.00"
                required={loadSource === 'own_customer'}
              />
              <p className="text-xs text-muted-foreground">
                Amount driver needs to collect from customer
              </p>
              {state?.errors?.balance_due && (
                <p className="text-xs text-destructive">{state.errors.balance_due}</p>
              )}
            </div>
          )}

          {/* Linehaul Amount - only show if rate and cuft are entered */}
          {pricing.cubicFeet && pricing.rate && (
            <div className="rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm">
              <p className="text-muted-foreground">Linehaul Amount</p>
              <p className="text-2xl font-semibold">${linehaulAmount.toFixed(2)}</p>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" name="notes" rows={3} placeholder="Driver-facing notes" />
          </div>
        </CardContent>
      </Card>

      {/* STORAGE LOCATION */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Warehouse className="h-4 w-4" />
            Storage Location (Optional)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Location</Label>
              <div className="flex gap-2">
                <Select
                  value={storageLocationId || undefined}
                  onValueChange={(value) => setStorageLocationId(value === 'none' ? '' : value)}
                >
                  <SelectTrigger className="h-9 flex-1">
                    <SelectValue placeholder="Select storage location" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No storage location</SelectItem>
                    {localStorageLocations.map((loc) => (
                      <SelectItem key={loc.id} value={loc.id}>
                        {loc.name} - {loc.city}, {loc.state}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {onCreateStorageLocation && (
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-9 w-9 flex-shrink-0"
                    onClick={() => setShowAddLocationModal(true)}
                    title="Add new storage location"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <input type="hidden" name="storage_location_id" value={storageLocationId} />
            </div>
            <div className="space-y-1.5">
              <Label>Storage Unit / Bay</Label>
              <Input
                name="storage_unit"
                value={storageUnit}
                onChange={(e) => setStorageUnit(e.target.value)}
                placeholder="e.g., Unit 205, Bay 12"
              />
              <p className="text-xs text-muted-foreground">
                Specific unit or bay number at this location
              </p>
            </div>
          </div>
          {storageLocationId && localStorageLocations.find((loc) => loc.id === storageLocationId) && (
            <div className="rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm">
              {(() => {
                const loc = localStorageLocations.find((l) => l.id === storageLocationId)!
                return (
                  <div className="space-y-1">
                    <p className="font-medium">{loc.name}</p>
                    {loc.address_line1 && <p className="text-muted-foreground">{loc.address_line1}</p>}
                    <p className="text-muted-foreground">{loc.city}, {loc.state} {loc.zip}</p>
                    {loc.gate_code && (
                      <p className="text-xs">Gate code: <span className="font-mono">{loc.gate_code}</span></p>
                    )}
                  </div>
                )
              })()}
            </div>
          )}
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

      {/* Add Storage Location Modal */}
      <Dialog open={showAddLocationModal} onOpenChange={setShowAddLocationModal}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Warehouse className="h-5 w-5" />
              Add Storage Location
            </DialogTitle>
            <DialogDescription>
              Quickly add a new storage location for this load.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-1.5">
              <Label>Location Name *</Label>
              <Input
                value={newLocation.name}
                onChange={(e) => setNewLocation((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="ABC Warehouse Chicago"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Location Type</Label>
              <Select
                value={newLocation.location_type}
                onValueChange={(value) => setNewLocation((prev) => ({ ...prev, location_type: value as LocationType }))}
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
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
            <div className="space-y-1.5">
              <Label>Street Address</Label>
              <Input
                value={newLocation.address_line1}
                onChange={(e) => setNewLocation((prev) => ({ ...prev, address_line1: e.target.value }))}
                placeholder="1234 Industrial Blvd"
              />
            </div>
            <div className="grid grid-cols-6 gap-3">
              <div className="col-span-2 space-y-1.5">
                <Label>ZIP *</Label>
                <Input
                  value={newLocation.zip}
                  onChange={(e) => setNewLocation((prev) => ({ ...prev, zip: e.target.value }))}
                  onBlur={handleNewLocationZip}
                  placeholder="60601"
                />
              </div>
              <div className="col-span-3 space-y-1.5">
                <Label>City *</Label>
                <Input
                  value={newLocation.city}
                  onChange={(e) => setNewLocation((prev) => ({ ...prev, city: e.target.value }))}
                  placeholder="Chicago"
                />
              </div>
              <div className="col-span-1 space-y-1.5">
                <Label>State *</Label>
                <Input
                  value={newLocation.state}
                  onChange={(e) => setNewLocation((prev) => ({ ...prev, state: e.target.value }))}
                  placeholder="IL"
                  maxLength={2}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Contact Name</Label>
                <Input
                  value={newLocation.contact_name}
                  onChange={(e) => setNewLocation((prev) => ({ ...prev, contact_name: e.target.value }))}
                  placeholder="Mike"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Contact Phone</Label>
                <Input
                  value={newLocation.contact_phone}
                  onChange={(e) => setNewLocation((prev) => ({ ...prev, contact_phone: e.target.value }))}
                  placeholder="312-555-1234"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Gate Code</Label>
              <Input
                value={newLocation.gate_code}
                onChange={(e) => setNewLocation((prev) => ({ ...prev, gate_code: e.target.value }))}
                placeholder="1234#"
              />
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowAddLocationModal(false)}
              disabled={newLocationSaving}
            >
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleCreateStorageLocation}
              disabled={newLocationSaving}
            >
              {newLocationSaving ? 'Saving...' : 'Add Location'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </form>
  )
}
