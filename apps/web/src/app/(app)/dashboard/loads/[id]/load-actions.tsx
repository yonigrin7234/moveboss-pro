'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Store, Route, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';

interface Trip {
  id: string;
  trip_number: string;
  origin_city?: string | null;
  destination_city?: string | null;
  driver?: { first_name?: string; last_name?: string } | null;
}

export interface MarketplacePostingData {
  cubic_feet: number;
  rate_per_cuft: number;
  linehaul_amount: number;
  is_open_to_counter: boolean;
  truck_requirement: 'any' | 'semi_only' | 'box_truck_only';
}

interface LoadActionsProps {
  loadId: string;
  postingStatus: string | null;
  trips: Trip[];
  initialCubicFeet?: number | null;
  /** Only brokers/moving companies can post to marketplace. If false, the button is hidden. */
  canPostToMarketplace?: boolean;
  onPostToMarketplace: (data: MarketplacePostingData) => Promise<{ success: boolean; error?: string }>;
  onAssignToTrip: (tripId: string) => Promise<{ success: boolean; error?: string }>;
}

function formatTripLabel(trip: Trip): string {
  const parts = [`Trip ${trip.trip_number}`];
  if (trip.origin_city && trip.destination_city) {
    parts.push(`${trip.origin_city} → ${trip.destination_city}`);
  }
  if (trip.driver?.first_name) {
    parts.push(`(${trip.driver.first_name} ${trip.driver.last_name || ''})`.trim());
  }
  return parts.join(' - ');
}

export function LoadActions({
  loadId,
  postingStatus,
  trips,
  initialCubicFeet,
  canPostToMarketplace = true,
  onPostToMarketplace,
  onAssignToTrip,
}: LoadActionsProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [showPostModal, setShowPostModal] = useState(false);
  const [selectedTripId, setSelectedTripId] = useState('');
  const [isAssigning, setIsAssigning] = useState(false);

  // Marketplace posting form state
  const [cubicFeet, setCubicFeet] = useState(initialCubicFeet?.toString() || '');
  const [ratePerCuft, setRatePerCuft] = useState('');
  const [linehaulAmount, setLinehaulAmount] = useState('');
  const [isOpenToCounter, setIsOpenToCounter] = useState(false);
  const [truckRequirement, setTruckRequirement] = useState<'any' | 'semi_only' | 'box_truck_only'>('any');

  const isDraft = !postingStatus || postingStatus === 'draft';
  const isPosted = postingStatus === 'posted';

  // Auto-calculate linehaul when cuft or rate changes
  const handleCuftChange = (value: string) => {
    setCubicFeet(value);
    const cuft = parseFloat(value);
    const rate = parseFloat(ratePerCuft);
    if (!isNaN(cuft) && !isNaN(rate)) {
      setLinehaulAmount((cuft * rate).toFixed(2));
    }
  };

  const handleRateChange = (value: string) => {
    setRatePerCuft(value);
    const cuft = parseFloat(cubicFeet);
    const rate = parseFloat(value);
    if (!isNaN(cuft) && !isNaN(rate)) {
      setLinehaulAmount((cuft * rate).toFixed(2));
    }
  };

  const handlePostToMarketplace = () => {
    // Validate required fields
    const cuft = parseFloat(cubicFeet);
    const rate = parseFloat(ratePerCuft);
    const linehaul = parseFloat(linehaulAmount);

    if (isNaN(cuft) || cuft <= 0) {
      toast({ title: 'Invalid CUFT', description: 'Please enter a valid cubic feet value.', variant: 'destructive' });
      return;
    }
    if (isNaN(rate) || rate <= 0) {
      toast({ title: 'Invalid Rate', description: 'Please enter a valid rate per CUFT.', variant: 'destructive' });
      return;
    }
    if (isNaN(linehaul) || linehaul <= 0) {
      toast({ title: 'Invalid Linehaul', description: 'Please enter a valid linehaul amount.', variant: 'destructive' });
      return;
    }

    startTransition(async () => {
      const result = await onPostToMarketplace({
        cubic_feet: cuft,
        rate_per_cuft: rate,
        linehaul_amount: linehaul,
        is_open_to_counter: isOpenToCounter,
        truck_requirement: truckRequirement,
      });
      if (result.success) {
        toast({
          title: 'Posted to Marketplace',
          description: 'This load is now visible on the marketplace.',
        });
        setShowPostModal(false);
        router.refresh();
      } else {
        toast({
          title: 'Failed to post',
          description: result.error || 'An error occurred.',
          variant: 'destructive',
        });
      }
    });
  };

  const handleAssignToTrip = async () => {
    if (!selectedTripId) return;

    setIsAssigning(true);
    try {
      const result = await onAssignToTrip(selectedTripId);
      if (result.success) {
        toast({
          title: 'Assigned to Trip',
          description: 'This load has been added to the trip.',
        });
        setSelectedTripId('');
        router.refresh();
      } else {
        toast({
          title: 'Failed to assign',
          description: result.error || 'An error occurred.',
          variant: 'destructive',
        });
      }
    } finally {
      setIsAssigning(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Post to Marketplace - only show for draft loads AND if user is a broker */}
      {isDraft && canPostToMarketplace && (
        <Button
          variant="default"
          size="sm"
          onClick={() => setShowPostModal(true)}
          className="gap-2"
        >
          <Store className="h-4 w-4" />
          Post to Marketplace
        </Button>
      )}

      {/* Already posted indicator */}
      {isPosted && (
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-full bg-green-500/10 text-green-600 dark:text-green-400">
          <Store className="h-3.5 w-3.5" />
          On Marketplace
        </span>
      )}

      {/* Assign to Trip */}
      {trips.length > 0 && (
        <div className="flex items-center gap-2">
          <Select value={selectedTripId} onValueChange={setSelectedTripId}>
            <SelectTrigger className="w-[240px] h-9">
              <SelectValue placeholder="Assign to trip..." />
            </SelectTrigger>
            <SelectContent>
              {trips.map((trip) => (
                <SelectItem key={trip.id} value={trip.id}>
                  {formatTripLabel(trip)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            onClick={handleAssignToTrip}
            disabled={!selectedTripId || isAssigning}
            className="gap-2"
          >
            {isAssigning ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Route className="h-4 w-4" />
            )}
            Assign
          </Button>
        </div>
      )}

      {/* Post to Marketplace Form Dialog */}
      <Dialog open={showPostModal} onOpenChange={setShowPostModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Store className="h-5 w-5" />
              Post to Marketplace
            </DialogTitle>
            <DialogDescription>
              Set pricing and options for carriers to see on the marketplace.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Pricing */}
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="mp_cubic_feet" className="text-sm">CUFT *</Label>
                <Input
                  id="mp_cubic_feet"
                  type="number"
                  min="1"
                  value={cubicFeet}
                  onChange={(e) => handleCuftChange(e.target.value)}
                  placeholder="500"
                  className="h-9"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="mp_rate" className="text-sm">Rate/CUFT ($) *</Label>
                <Input
                  id="mp_rate"
                  type="number"
                  min="0"
                  step="0.01"
                  value={ratePerCuft}
                  onChange={(e) => handleRateChange(e.target.value)}
                  placeholder="3.50"
                  className="h-9"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="mp_linehaul" className="text-sm">Linehaul ($) *</Label>
                <Input
                  id="mp_linehaul"
                  type="number"
                  min="0"
                  step="0.01"
                  value={linehaulAmount}
                  onChange={(e) => setLinehaulAmount(e.target.value)}
                  placeholder="1750.00"
                  className="h-9"
                />
              </div>
            </div>

            {/* Truck Requirement */}
            <div className="space-y-2">
              <Label className="text-sm">Truck Requirement</Label>
              <RadioGroup
                value={truckRequirement}
                onValueChange={(v) => setTruckRequirement(v as typeof truckRequirement)}
                className="flex flex-wrap gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="any" id="truck_any" />
                  <Label htmlFor="truck_any" className="font-normal cursor-pointer text-sm">Any</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="semi_only" id="truck_semi" />
                  <Label htmlFor="truck_semi" className="font-normal cursor-pointer text-sm">Semi Only</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="box_truck_only" id="truck_box" />
                  <Label htmlFor="truck_box" className="font-normal cursor-pointer text-sm">Box Truck Only</Label>
                </div>
              </RadioGroup>
            </div>

            {/* Counter Offers */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="mp_counter"
                checked={isOpenToCounter}
                onCheckedChange={(checked) => setIsOpenToCounter(checked === true)}
              />
              <Label htmlFor="mp_counter" className="font-normal cursor-pointer text-sm">
                Open to counter offers from carriers
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPostModal(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button onClick={handlePostToMarketplace} disabled={isPending}>
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Posting...
                </>
              ) : (
                'Post to Marketplace'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
