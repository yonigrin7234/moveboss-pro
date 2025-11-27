'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { UserCircle, Truck, ArrowRight, ArrowLeft, Check, Loader2 } from 'lucide-react';
import { updateStepAction, setupOwnerOperatorAction } from '../actions';

interface OwnerOperatorSetupProps {
  userEmail: string;
  currentStep: number;
}

export function OwnerOperatorSetup({ userEmail, currentStep }: OwnerOperatorSetupProps) {
  const router = useRouter();
  const [step, setStep] = useState(currentStep);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Personal info
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [licenseState, setLicenseState] = useState('');

  // Business info
  const [businessName, setBusinessName] = useState('');
  const [dotNumber, setDotNumber] = useState('');

  // Truck info
  const [unitNumber, setUnitNumber] = useState('');
  const [truckType, setTruckType] = useState('');
  const [capacity, setCapacity] = useState('');

  const handleNext = async () => {
    setError(null);

    if (step === 1) {
      // Validate personal info
      if (!firstName.trim() || !lastName.trim()) {
        setError('First and last name are required');
        return;
      }

      await updateStepAction(2, { firstName, lastName, phone });
      setStep(2);
    } else if (step === 2) {
      // Validate business info
      if (!businessName.trim()) {
        setError('Business name is required');
        return;
      }

      await updateStepAction(3, { businessName, dotNumber });
      setStep(3);
    } else if (step === 3) {
      // Create everything
      if (!unitNumber.trim() || !truckType) {
        setError('Truck information is required');
        return;
      }

      setIsSubmitting(true);

      const result = await setupOwnerOperatorAction(
        {
          name: businessName,
          dot_number: dotNumber || undefined,
          phone: phone || undefined,
          is_carrier: true,
          is_broker: false,
        },
        {
          first_name: firstName,
          last_name: lastName,
          phone: phone || undefined,
          email: userEmail,
          license_number: licenseNumber || undefined,
          license_state: licenseState || undefined,
        },
        {
          unit_number: unitNumber,
          make: truckType,
          cubic_capacity: capacity ? parseInt(capacity) : undefined,
        }
      );

      if (!result.success) {
        setError(result.error || 'Failed to complete setup');
        setIsSubmitting(false);
        return;
      }

      router.push('/dashboard');
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    } else {
      router.push('/onboarding');
    }
  };

  return (
    <div className="max-w-xl mx-auto space-y-6">
      {/* Progress */}
      <div className="flex items-center justify-center gap-2">
        {[1, 2, 3].map((s) => (
          <div
            key={s}
            className={`h-2 w-12 rounded-full ${s <= step ? 'bg-primary' : 'bg-muted'}`}
          />
        ))}
      </div>

      {/* Step 1: Personal Info */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <UserCircle className="h-8 w-8 text-purple-500" />
              <div>
                <CardTitle>Personal Information</CardTitle>
                <CardDescription>Tell us about yourself</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name *</Label>
                <Input
                  id="firstName"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name *</Label>
                <Input
                  id="lastName"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(555) 123-4567"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="licenseNumber">CDL Number</Label>
                <Input
                  id="licenseNumber"
                  value={licenseNumber}
                  onChange={(e) => setLicenseNumber(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="licenseState">CDL State</Label>
                <Input
                  id="licenseState"
                  value={licenseState}
                  onChange={(e) => setLicenseState(e.target.value)}
                  maxLength={2}
                  placeholder="CA"
                />
              </div>
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}
          </CardContent>
        </Card>
      )}

      {/* Step 2: Business Info */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <UserCircle className="h-8 w-8 text-purple-500" />
              <div>
                <CardTitle>Business Information</CardTitle>
                <CardDescription>Your operating authority</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="businessName">Business Name *</Label>
              <Input
                id="businessName"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="Your Name Trucking LLC"
              />
              <p className="text-xs text-muted-foreground">
                This can be your name or your registered business name
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="dotNumber">DOT Number</Label>
              <Input
                id="dotNumber"
                value={dotNumber}
                onChange={(e) => setDotNumber(e.target.value)}
                placeholder="1234567"
              />
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}
          </CardContent>
        </Card>
      )}

      {/* Step 3: Truck Info */}
      {step === 3 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Truck className="h-8 w-8 text-purple-500" />
              <div>
                <CardTitle>Your Truck</CardTitle>
                <CardDescription>Tell us about your truck</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="unitNumber">Unit Number / Name *</Label>
              <Input
                id="unitNumber"
                value={unitNumber}
                onChange={(e) => setUnitNumber(e.target.value)}
                placeholder="e.g., My Truck or Unit 1"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="truckType">Truck Type *</Label>
              <Select value={truckType} onValueChange={setTruckType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="straight_truck">Straight Truck</SelectItem>
                  <SelectItem value="tractor_trailer">Tractor Trailer</SelectItem>
                  <SelectItem value="sprinter_van">Sprinter Van</SelectItem>
                  <SelectItem value="box_truck">Box Truck</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="capacity">Capacity (CUFT)</Label>
              <Input
                id="capacity"
                type="number"
                value={capacity}
                onChange={(e) => setCapacity(e.target.value)}
                placeholder="e.g., 1200"
              />
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}
          </CardContent>
        </Card>
      )}

      {/* Navigation */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={handleBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Button onClick={handleNext} disabled={isSubmitting}>
          {isSubmitting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : step === 3 ? (
            <Check className="mr-2 h-4 w-4" />
          ) : (
            <ArrowRight className="mr-2 h-4 w-4" />
          )}
          {step === 3 ? 'Complete Setup' : 'Next'}
        </Button>
      </div>
    </div>
  );
}
