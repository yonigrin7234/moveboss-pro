'use client';

import { useState, useEffect } from 'react';
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
import { Building2, ArrowRight, ArrowLeft, Check, Loader2, User } from 'lucide-react';
import { updateStepAction, setupCompanyAction } from '../actions';

interface CompanySetupProps {
  currentStep: number;
  canPostLoads: boolean;
  canHaulLoads: boolean;
  userEmail: string;
  userFullName: string;
}

export function CompanySetup({ currentStep, canPostLoads, canHaulLoads, userEmail, userFullName }: CompanySetupProps) {
  const router = useRouter();
  const [step, setStep] = useState(currentStep);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 1: Company Info
  const [companyName, setCompanyName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [dotNumber, setDotNumber] = useState('');
  const [mcNumber, setMcNumber] = useState('');

  // Step 2: Address + Owner Info
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zip, setZip] = useState('');
  const [ownerName, setOwnerName] = useState(userFullName);
  const [ownerPhone, setOwnerPhone] = useState('');
  const [ownerEmail, setOwnerEmail] = useState(userEmail);

  // Sync owner phone with company phone if not manually changed
  const [ownerPhoneManuallySet, setOwnerPhoneManuallySet] = useState(false);
  useEffect(() => {
    if (!ownerPhoneManuallySet && phone) {
      setOwnerPhone(phone);
    }
  }, [phone, ownerPhoneManuallySet]);

  const handleNext = async () => {
    if (step === 1) {
      // Validate Step 1
      if (!companyName.trim()) {
        setError('Company name is required');
        return;
      }
      if (!phone.trim()) {
        setError('Phone number is required');
        return;
      }
      if (!email.trim()) {
        setError('Email is required');
        return;
      }
      setError(null);
      setStep(2);
      await updateStepAction(2, { companyName, phone, email });
    } else if (step === 2) {
      // Validate Step 2
      if (!address.trim()) {
        setError('Address is required');
        return;
      }
      if (!city.trim()) {
        setError('City is required');
        return;
      }
      if (!state.trim()) {
        setError('State is required');
        return;
      }
      if (!ownerName.trim()) {
        setError('Owner name is required');
        return;
      }
      if (!ownerPhone.trim()) {
        setError('Owner phone is required');
        return;
      }
      if (!ownerEmail.trim()) {
        setError('Owner email is required');
        return;
      }

      // Create company and complete
      setIsSubmitting(true);
      setError(null);

      const result = await setupCompanyAction({
        name: companyName,
        dot_number: dotNumber || undefined,
        mc_number: mcNumber || undefined,
        phone: phone,
        email: email,
        street: address,
        city: city,
        state: state,
        postal_code: zip || undefined,
        is_carrier: canHaulLoads,
        is_broker: canPostLoads,
        owner_name: ownerName,
        owner_phone: ownerPhone,
        owner_email: ownerEmail,
      });

      if (!result.success) {
        setError(result.error || 'Failed to create company');
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
      router.push('/onboarding?change=true');
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

      {/* Step 1: Company Info + Contact */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Building2 className="h-8 w-8 text-blue-500" />
              <div>
                <CardTitle>Company Information</CardTitle>
                <CardDescription>Tell us about your moving company</CardDescription>
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
                placeholder="Your Moving Company LLC"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Company Phone *</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(555) 123-4567"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Company Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="dispatch@company.com"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="dotNumber">DOT Number</Label>
                <Input
                  id="dotNumber"
                  value={dotNumber}
                  onChange={(e) => setDotNumber(e.target.value)}
                  placeholder="Optional"
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

            {error && <p className="text-sm text-red-500">{error}</p>}
          </CardContent>
        </Card>
      )}

      {/* Step 2: Address + Owner Info */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Building2 className="h-8 w-8 text-blue-500" />
              <div>
                <CardTitle>Address & Owner Details</CardTitle>
                <CardDescription>Where is your business located?</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="address">Address *</Label>
              <Input
                id="address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="123 Main Street"
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city">City *</Label>
                <Input
                  id="city"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Miami"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">State *</Label>
                <Input
                  id="state"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  maxLength={2}
                  placeholder="FL"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="zip">ZIP</Label>
                <Input
                  id="zip"
                  value={zip}
                  onChange={(e) => setZip(e.target.value)}
                  placeholder="33101"
                />
              </div>
            </div>

            {/* Owner Info Section */}
            <div className="pt-4 border-t">
              <div className="flex items-center gap-2 mb-3">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Primary Contact / Owner</span>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="ownerName">Name *</Label>
                  <Input
                    id="ownerName"
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    placeholder="John Smith"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="ownerPhone">Phone *</Label>
                    <Input
                      id="ownerPhone"
                      type="tel"
                      value={ownerPhone}
                      onChange={(e) => {
                        setOwnerPhone(e.target.value);
                        setOwnerPhoneManuallySet(true);
                      }}
                      placeholder="(555) 123-4567"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ownerEmail">Email *</Label>
                    <Input
                      id="ownerEmail"
                      type="email"
                      value={ownerEmail}
                      onChange={(e) => setOwnerEmail(e.target.value)}
                      placeholder="owner@company.com"
                    />
                  </div>
                </div>
              </div>
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
          ) : step === 2 ? (
            <Check className="mr-2 h-4 w-4" />
          ) : (
            <ArrowRight className="mr-2 h-4 w-4" />
          )}
          {step === 2 ? 'Complete Setup' : 'Next'}
        </Button>
      </div>
    </div>
  );
}
