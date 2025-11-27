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
import { Truck, ArrowRight, ArrowLeft, Check, Loader2 } from 'lucide-react';
import { updateStepAction, setupCarrierAction } from '../actions';

interface CarrierSetupProps {
  currentStep: number;
}

export function CarrierSetup({ currentStep }: CarrierSetupProps) {
  const router = useRouter();
  const [step, setStep] = useState(currentStep);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Company form data
  const [companyName, setCompanyName] = useState('');
  const [dotNumber, setDotNumber] = useState('');
  const [mcNumber, setMcNumber] = useState('');
  const [phone, setPhone] = useState('');

  // Truck form data
  const [unitNumber, setUnitNumber] = useState('');
  const [truckType, setTruckType] = useState('');
  const [capacity, setCapacity] = useState('');

  const handleNext = async () => {
    setError(null);

    if (step === 1) {
      // Validate and save company
      if (!companyName.trim()) {
        setError('Company name is required');
        return;
      }

      await updateStepAction(2, { companyName, dotNumber, mcNumber });
      setStep(2);
    } else if (step === 2) {
      // Validate and save truck (optional)
      setIsSubmitting(true);

      const truckData =
        unitNumber.trim() && truckType
          ? {
              unit_number: unitNumber,
              make: truckType,
              cubic_capacity: capacity ? parseInt(capacity) : undefined,
            }
          : undefined;

      const result = await setupCarrierAction(
        {
          name: companyName,
          dot_number: dotNumber || undefined,
          mc_number: mcNumber || undefined,
          phone: phone || undefined,
          is_carrier: true,
          is_broker: false,
        },
        truckData
      );

      if (!result.success) {
        setError(result.error || 'Failed to complete setup');
        setIsSubmitting(false);
        return;
      }

      router.push('/dashboard');
    }
  };

  const handleSkipTruck = async () => {
    setIsSubmitting(true);

    const result = await setupCarrierAction({
      name: companyName,
      dot_number: dotNumber || undefined,
      mc_number: mcNumber || undefined,
      phone: phone || undefined,
      is_carrier: true,
      is_broker: false,
    });

    if (!result.success) {
      setError(result.error || 'Failed to complete setup');
      setIsSubmitting(false);
      return;
    }

    router.push('/dashboard');
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
        {[1, 2].map((s) => (
          <div
            key={s}
            className={`h-2 w-16 rounded-full ${s <= step ? 'bg-primary' : 'bg-muted'}`}
          />
        ))}
      </div>

      {/* Step 1: Company Info */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Truck className="h-8 w-8 text-green-500" />
              <div>
                <CardTitle>Carrier Information</CardTitle>
                <CardDescription>Set up your trucking company</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="companyName">Company Name *</Label>
              <Input
                id="companyName"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Your Trucking Company LLC"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="dotNumber">DOT Number *</Label>
                <Input
                  id="dotNumber"
                  value={dotNumber}
                  onChange={(e) => setDotNumber(e.target.value)}
                  placeholder="1234567"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="mcNumber">MC Number</Label>
                <Input
                  id="mcNumber"
                  value={mcNumber}
                  onChange={(e) => setMcNumber(e.target.value)}
                  placeholder="Optional"
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

            {error && <p className="text-sm text-red-500">{error}</p>}
          </CardContent>
        </Card>
      )}

      {/* Step 2: First Truck */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Truck className="h-8 w-8 text-green-500" />
              <div>
                <CardTitle>Add Your First Truck</CardTitle>
                <CardDescription>You can add more trucks later</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="unitNumber">Unit Number *</Label>
              <Input
                id="unitNumber"
                value={unitNumber}
                onChange={(e) => setUnitNumber(e.target.value)}
                placeholder="e.g., Truck 101"
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
                  <SelectItem value="flatbed">Flatbed</SelectItem>
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
                placeholder="e.g., 2000"
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
        <div className="flex gap-2">
          {step === 2 && (
            <Button variant="ghost" onClick={handleSkipTruck} disabled={isSubmitting}>
              Skip for now
            </Button>
          )}
          <Button onClick={handleNext} disabled={isSubmitting}>
            {isSubmitting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : step === 2 ? (
              <Check className="mr-2 h-4 w-4" />
            ) : (
              <ArrowRight className="mr-2 h-4 w-4" />
            )}
            {step === 2 ? 'Complete Setup' : 'Next'}
          </Button>
        </div>
      </div>
    </div>
  );
}
