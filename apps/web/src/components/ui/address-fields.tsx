'use client';

import { useState, useEffect, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { useZipLookup } from '@/hooks/useZipLookup';

interface AddressFieldsProps {
  zip: string;
  city: string;
  state: string;
  address?: string;
  address2?: string;
  onZipChange: (zip: string) => void;
  onCityChange: (city: string) => void;
  onStateChange: (state: string) => void;
  onAddressChange?: (address: string) => void;
  onAddress2Change?: (address2: string) => void;
  showAddress?: boolean;
  showAddress2?: boolean;
  zipRequired?: boolean;
  cityRequired?: boolean;
  stateRequired?: boolean;
  addressRequired?: boolean;
  disabled?: boolean;
  zipLabel?: string;
  cityLabel?: string;
  stateLabel?: string;
  addressLabel?: string;
  address2Label?: string;
}

export function AddressFields({
  zip,
  city,
  state,
  address = '',
  address2 = '',
  onZipChange,
  onCityChange,
  onStateChange,
  onAddressChange,
  onAddress2Change,
  showAddress = true,
  showAddress2 = false,
  zipRequired = false,
  cityRequired = true,
  stateRequired = true,
  addressRequired = true,
  disabled = false,
  zipLabel = 'ZIP Code',
  cityLabel = 'City',
  stateLabel = 'State',
  addressLabel = 'Street Address',
  address2Label = 'Address Line 2',
}: AddressFieldsProps) {
  const { lookup, isLoading } = useZipLookup();
  const [hasAutoFilled, setHasAutoFilled] = useState(false);

  // Handle zip code change with auto-lookup
  const handleZipChange = useCallback(
    async (newZip: string) => {
      onZipChange(newZip);

      // Only auto-fill if 5 digits and city/state are empty or were auto-filled
      const cleanZip = newZip.replace(/\D/g, '');
      if (cleanZip.length === 5 && (!city || !state || hasAutoFilled)) {
        const result = await lookup(cleanZip);
        if (result) {
          onCityChange(result.city);
          onStateChange(result.stateAbbr);
          setHasAutoFilled(true);
        }
      }
    },
    [lookup, onZipChange, onCityChange, onStateChange, city, state, hasAutoFilled]
  );

  // Reset auto-fill tracking when user manually changes city/state
  const handleCityChange = useCallback(
    (newCity: string) => {
      onCityChange(newCity);
      setHasAutoFilled(false);
    },
    [onCityChange]
  );

  const handleStateChange = useCallback(
    (newState: string) => {
      onStateChange(newState);
      setHasAutoFilled(false);
    },
    [onStateChange]
  );

  return (
    <div className="space-y-4">
      {/* ZIP Code First */}
      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="zip">
            {zipLabel}
            {zipRequired && ' *'}
          </Label>
          <div className="relative">
            <Input
              id="zip"
              value={zip}
              onChange={(e) => handleZipChange(e.target.value)}
              placeholder="12345"
              maxLength={10}
              disabled={disabled}
              className={isLoading ? 'pr-8' : ''}
            />
            {isLoading && (
              <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
            )}
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="city">
            {cityLabel}
            {cityRequired && ' *'}
          </Label>
          <Input
            id="city"
            value={city}
            onChange={(e) => handleCityChange(e.target.value)}
            placeholder="City"
            disabled={disabled}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="state">
            {stateLabel}
            {stateRequired && ' *'}
          </Label>
          <Input
            id="state"
            value={state}
            onChange={(e) => handleStateChange(e.target.value.toUpperCase())}
            placeholder="ST"
            maxLength={2}
            disabled={disabled}
          />
        </div>
      </div>

      {/* Street Address */}
      {showAddress && (
        <div className="space-y-2">
          <Label htmlFor="address">
            {addressLabel}
            {addressRequired && ' *'}
          </Label>
          <Input
            id="address"
            value={address}
            onChange={(e) => onAddressChange?.(e.target.value)}
            placeholder="123 Main Street"
            disabled={disabled}
          />
        </div>
      )}

      {/* Address Line 2 */}
      {showAddress2 && (
        <div className="space-y-2">
          <Label htmlFor="address2">{address2Label}</Label>
          <Input
            id="address2"
            value={address2}
            onChange={(e) => onAddress2Change?.(e.target.value)}
            placeholder="Suite, Unit, Building (optional)"
            disabled={disabled}
          />
        </div>
      )}
    </div>
  );
}

// Uncontrolled version for native form submission (uses name attributes)
interface FormAddressFieldsProps {
  defaultZip?: string;
  defaultCity?: string;
  defaultState?: string;
  defaultAddress?: string;
  defaultAddress2?: string;
  zipName?: string;
  cityName?: string;
  stateName?: string;
  addressName?: string;
  address2Name?: string;
  showAddress?: boolean;
  showAddress2?: boolean;
  zipRequired?: boolean;
  cityRequired?: boolean;
  stateRequired?: boolean;
  addressRequired?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  errors?: Record<string, string>;
}

export function FormAddressFields({
  defaultZip = '',
  defaultCity = '',
  defaultState = '',
  defaultAddress = '',
  defaultAddress2 = '',
  zipName = 'zip',
  cityName = 'city',
  stateName = 'state',
  addressName = 'address_line1',
  address2Name = 'address_line2',
  showAddress = true,
  showAddress2 = false,
  zipRequired = false,
  cityRequired = true,
  stateRequired = true,
  addressRequired = true,
  disabled = false,
  readOnly = false,
  errors = {},
}: FormAddressFieldsProps) {
  const { lookup, isLoading } = useZipLookup();

  const handleZipBlur = useCallback(
    async (e: React.FocusEvent<HTMLInputElement>) => {
      const zipValue = e.target.value;
      const cleanZip = zipValue.replace(/\D/g, '');

      if (cleanZip.length === 5) {
        const result = await lookup(cleanZip);
        if (result) {
          // Find the city and state inputs by name and update them
          const form = e.target.form;
          if (form) {
            const cityInput = form.elements.namedItem(cityName) as HTMLInputElement;
            const stateInput = form.elements.namedItem(stateName) as HTMLInputElement;

            // Only auto-fill if fields are empty
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
    [lookup, cityName, stateName]
  );

  return (
    <div className="space-y-4">
      {/* ZIP, City, State Row */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor={zipName}>
            ZIP Code
            {zipRequired && ' *'}
          </Label>
          <div className="relative">
            <Input
              id={zipName}
              name={zipName}
              defaultValue={defaultZip}
              onBlur={handleZipBlur}
              placeholder="12345"
              maxLength={10}
              disabled={disabled}
              readOnly={readOnly}
              className={isLoading ? 'pr-8' : ''}
            />
            {isLoading && (
              <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
            )}
          </div>
          {errors[zipName] && <p className="text-xs text-destructive">{errors[zipName]}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor={cityName}>
            City
            {cityRequired && ' *'}
          </Label>
          <Input
            id={cityName}
            name={cityName}
            defaultValue={defaultCity}
            placeholder="City"
            disabled={disabled}
            readOnly={readOnly}
          />
          {errors[cityName] && <p className="text-xs text-destructive">{errors[cityName]}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor={stateName}>
            State
            {stateRequired && ' *'}
          </Label>
          <Input
            id={stateName}
            name={stateName}
            defaultValue={defaultState}
            placeholder="ST"
            maxLength={2}
            disabled={disabled}
            readOnly={readOnly}
          />
          {errors[stateName] && <p className="text-xs text-destructive">{errors[stateName]}</p>}
        </div>
      </div>

      {/* Street Address */}
      {showAddress && (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor={addressName}>
              Address Line 1
              {addressRequired && ' *'}
            </Label>
            <Input
              id={addressName}
              name={addressName}
              defaultValue={defaultAddress}
              placeholder="123 Main Street"
              disabled={disabled}
              readOnly={readOnly}
            />
            {errors[addressName] && <p className="text-xs text-destructive">{errors[addressName]}</p>}
          </div>
          {showAddress2 && (
            <div className="space-y-2">
              <Label htmlFor={address2Name}>Address Line 2</Label>
              <Input
                id={address2Name}
                name={address2Name}
                defaultValue={defaultAddress2}
                placeholder="Suite, Unit (optional)"
                disabled={disabled}
                readOnly={readOnly}
              />
              {errors[address2Name] && <p className="text-xs text-destructive">{errors[address2Name]}</p>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Simpler version for forms that just need zip/city/state inline
interface ZipCityStateFieldsProps {
  zip: string;
  city: string;
  state: string;
  onZipChange: (zip: string) => void;
  onCityChange: (city: string) => void;
  onStateChange: (state: string) => void;
  zipRequired?: boolean;
  cityRequired?: boolean;
  stateRequired?: boolean;
  disabled?: boolean;
}

export function ZipCityStateFields({
  zip,
  city,
  state,
  onZipChange,
  onCityChange,
  onStateChange,
  zipRequired = false,
  cityRequired = true,
  stateRequired = true,
  disabled = false,
}: ZipCityStateFieldsProps) {
  const { lookup, isLoading } = useZipLookup();
  const [hasAutoFilled, setHasAutoFilled] = useState(false);

  const handleZipChange = useCallback(
    async (newZip: string) => {
      onZipChange(newZip);

      const cleanZip = newZip.replace(/\D/g, '');
      if (cleanZip.length === 5 && (!city || !state || hasAutoFilled)) {
        const result = await lookup(cleanZip);
        if (result) {
          onCityChange(result.city);
          onStateChange(result.stateAbbr);
          setHasAutoFilled(true);
        }
      }
    },
    [lookup, onZipChange, onCityChange, onStateChange, city, state, hasAutoFilled]
  );

  return (
    <div className="grid grid-cols-3 gap-4">
      <div className="space-y-2">
        <Label htmlFor="zip">
          ZIP Code
          {zipRequired && ' *'}
        </Label>
        <div className="relative">
          <Input
            id="zip"
            value={zip}
            onChange={(e) => handleZipChange(e.target.value)}
            placeholder="12345"
            maxLength={10}
            disabled={disabled}
            className={isLoading ? 'pr-8' : ''}
          />
          {isLoading && (
            <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
          )}
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="city">
          City
          {cityRequired && ' *'}
        </Label>
        <Input
          id="city"
          value={city}
          onChange={(e) => {
            onCityChange(e.target.value);
            setHasAutoFilled(false);
          }}
          placeholder="City"
          disabled={disabled}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="state">
          State
          {stateRequired && ' *'}
        </Label>
        <Input
          id="state"
          value={state}
          onChange={(e) => {
            onStateChange(e.target.value.toUpperCase());
            setHasAutoFilled(false);
          }}
          placeholder="ST"
          maxLength={2}
          disabled={disabled}
        />
      </div>
    </div>
  );
}
