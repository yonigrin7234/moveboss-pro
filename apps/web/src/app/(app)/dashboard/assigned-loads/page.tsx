import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { getCurrentUser } from '@/lib/supabase-server';
import { getCarrierAssignedLoads, getLoadsNeedingTripAssignment } from '@/data/marketplace';
import { getWorkspaceCompanyForUser } from '@/data/companies';
import { giveLoadBack } from '@/data/cancellations';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { GiveBackForm } from '@/components/give-back-form';
import Link from 'next/link';
import {
  ArrowRight,
  Package,
  Truck,
  Calendar,
  Building2,
  User,
  Clock,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
} from 'lucide-react';

const statusConfig: Record<string, { label: string; color: string }> = {
  pending: { label: 'Needs Confirm', color: 'bg-yellow-500/20 text-yellow-400' },
  accepted: { label: 'Ready to Load', color: 'bg-blue-500/20 text-blue-400' },
  loading: { label: 'Loading', color: 'bg-yellow-500/20 text-yellow-400' },
  loaded: { label: 'Loaded', color: 'bg-orange-500/20 text-orange-400' },
  in_transit: { label: 'In Transit', color: 'bg-purple-500/20 text-purple-400' },
  delivered: { label: 'Delivered', color: 'bg-green-500/20 text-green-400' },
};

const reasonOptions = [
  { value: 'capacity_issue', label: 'Capacity issue' },
  { value: 'equipment_breakdown', label: 'Equipment breakdown' },
  { value: 'driver_unavailable', label: 'Driver unavailable' },
  { value: 'scheduling_conflict', label: 'Scheduling conflict' },
  { value: 'other', label: 'Other' },
];

export default async function AssignedLoadsPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const [loads, carrierCompany, loadsNeedingTrip] = await Promise.all([
    getCarrierAssignedLoads(user.id),
    getWorkspaceCompanyForUser(user.id),
    getLoadsNeedingTripAssignment(user.id),
  ]);

  const carrierId = carrierCompany?.id;

  // Separate confirmed vs pending confirmation
  const needsConfirmation = loads.filter((l) => !l.carrier_confirmed_at);
  const confirmedLoads = loads.filter((l) => l.carrier_confirmed_at);

  // Group confirmed loads by status - only in_transit/loading can't be given back
  const activeLoads = confirmedLoads.filter(
    (l) => !['delivered', 'cancelled'].includes(l.load_status)
  );
  const completedLoads = confirmedLoads.filter(
    (l) => l.load_status === 'delivered'
  );

  async function handleGiveBack(formData: FormData): Promise<{ success: boolean; error?: string }> {
    'use server';
    try {
      const currentUser = await getCurrentUser();
      if (!currentUser) {
        return { success: false, error: 'Not authenticated' };
      }

      const loadId = formData.get('load_id') as string;
      const reasonCode = formData.get('reason_code') as string;
      const carrierIdValue = formData.get('carrier_id') as string;

      console.log('[handleGiveBack] Attempting give back:', { loadId, reasonCode, carrierIdValue });

      if (!loadId || !reasonCode || !carrierIdValue) {
        return { success: false, error: 'Missing required fields' };
      }

      const result = await giveLoadBack(loadId, currentUser.id, carrierIdValue, reasonCode);
      console.log('[handleGiveBack] Result:', result);

      if (!result.success) {
        return { success: false, error: result.error };
      }

      revalidatePath('/dashboard/assigned-loads');
      revalidatePath('/dashboard/load-board');
      return { success: true };
    } catch (error) {
      console.error('[handleGiveBack] Exception:', error);
      return { success: false, error: 'An unexpected error occurred' };
    }
  }

  return (
    <div className="container py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Assigned Loads</h1>
          <p className="text-muted-foreground">
            Loads assigned to you by companies
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/dashboard/load-board">
            <Package className="h-4 w-4 mr-2" />
            Find More Loads
          </Link>
        </Button>
      </div>

      {/* Needs Confirmation */}
      {needsConfirmation.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-yellow-500" />
            Needs Confirmation ({needsConfirmation.length})
          </h2>

          <div className="space-y-2">
            {needsConfirmation.map((load) => {
              const company = Array.isArray(load.company)
                ? load.company[0]
                : load.company;
              const totalValue =
                load.carrier_rate && load.estimated_cuft
                  ? load.carrier_rate * load.estimated_cuft
                  : null;

              return (
                <Link
                  key={load.id}
                  href={`/dashboard/assigned-loads/${load.id}/confirm`}
                >
                  <Card className="hover:bg-muted/50 transition-colors cursor-pointer border-yellow-500/30">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                            <Building2 className="h-4 w-4" />
                            <span>{company?.name}</span>
                            <span>-</span>
                            <span>{load.load_number}</span>
                          </div>
                          <div className="flex items-center gap-2 mb-2">
                            <p className="font-semibold">
                              {load.origin_city}, {load.origin_state}
                            </p>
                            <ArrowRight className="h-4 w-4 text-muted-foreground" />
                            <p className="font-semibold">
                              {load.destination_city}, {load.destination_state}
                            </p>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Package className="h-4 w-4" />
                              {load.estimated_cuft} CUFT
                            </span>
                            {load.carrier_rate && (
                              <span className="text-green-500 font-medium">
                                ${load.carrier_rate.toFixed(2)}/cf
                                {totalValue && ` = $${totalValue.toLocaleString()}`}
                              </span>
                            )}
                          </div>
                        </div>
                        <Badge className="bg-yellow-500/20 text-yellow-400">
                          <Clock className="h-3 w-3 mr-1" />
                          Confirm Now
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Needs Trip Assignment - Loads confirmed but not on a trip */}
      {loadsNeedingTrip.length > 0 && (
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Needs Trip Assignment ({loadsNeedingTrip.length})
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              These loads are confirmed but not on a trip. Drivers cannot see them on mobile until assigned to a trip.
            </p>
          </div>

          <div className="space-y-2">
            {loadsNeedingTrip.map((load) => {
              const company = Array.isArray(load.company)
                ? load.company[0]
                : load.company;
              const status =
                statusConfig[load.load_status] || statusConfig.accepted;

              return (
                <Link
                  key={load.id}
                  href={`/dashboard/assigned-loads/${load.id}`}
                >
                  <Card className="hover:bg-muted/50 transition-colors cursor-pointer border-orange-500/30">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                            <Building2 className="h-4 w-4" />
                            <span>{company?.name}</span>
                            <span>-</span>
                            <span>{load.load_number}</span>
                          </div>
                          <div className="flex items-center gap-2 mb-2">
                            <p className="font-semibold">
                              {load.origin_city}, {load.origin_state}
                            </p>
                            <ArrowRight className="h-4 w-4 text-muted-foreground" />
                            <p className="font-semibold">
                              {load.destination_city}, {load.destination_state}
                            </p>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            {load.expected_load_date && (
                              <span className="flex items-center gap-1">
                                <Calendar className="h-4 w-4" />
                                {new Date(
                                  load.expected_load_date
                                ).toLocaleDateString()}
                              </span>
                            )}
                            {load.assigned_driver_name ? (
                              <span className="flex items-center gap-1">
                                <User className="h-4 w-4" />
                                {load.assigned_driver_name}
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 text-yellow-500">
                                <User className="h-4 w-4" />
                                No driver
                              </span>
                            )}
                            {load.carrier_rate && (
                              <span className="text-green-500 font-medium">
                                ${load.carrier_rate.toFixed(2)}/cf
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <Badge className={status.color}>{status.label}</Badge>
                          <Badge variant="outline" className="text-orange-500 border-orange-500/50">
                            <Truck className="h-3 w-3 mr-1" />
                            Add to Trip
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Active Loads */}
      {activeLoads.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Truck className="h-5 w-5 text-blue-500" />
            Active Loads ({activeLoads.length})
          </h2>

          <div className="space-y-2">
            {activeLoads.map((load) => {
              const company = Array.isArray(load.company)
                ? load.company[0]
                : load.company;
              const status =
                statusConfig[load.load_status] || statusConfig.accepted;
              const totalValue =
                load.carrier_rate && load.estimated_cuft
                  ? load.carrier_rate * load.estimated_cuft
                  : null;
              // Can give back if load is not yet in transit or beyond
              const canGiveBack = ['accepted', 'loading'].includes(load.load_status) && carrierId;

              return (
                <Card key={load.id} className="hover:bg-muted/50 transition-colors">
                  <CardContent className="p-4">
                    <Link href={`/dashboard/assigned-loads/${load.id}`} className="block">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                            <Building2 className="h-4 w-4" />
                            <span>{company?.name}</span>
                            <span>-</span>
                            <span>{load.load_number}</span>
                          </div>
                          <div className="flex items-center gap-2 mb-2">
                            <p className="font-semibold">
                              {load.origin_city}, {load.origin_state}
                            </p>
                            <ArrowRight className="h-4 w-4 text-muted-foreground" />
                            <p className="font-semibold">
                              {load.destination_city}, {load.destination_state}
                            </p>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Package className="h-4 w-4" />
                              {load.estimated_cuft} CUFT
                            </span>
                            {load.expected_load_date && (
                              <span className="flex items-center gap-1">
                                <Calendar className="h-4 w-4" />
                                {new Date(
                                  load.expected_load_date
                                ).toLocaleDateString()}
                              </span>
                            )}
                            {load.assigned_driver_name ? (
                              <span className="flex items-center gap-1">
                                <User className="h-4 w-4" />
                                {load.assigned_driver_name}
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 text-yellow-500">
                                <User className="h-4 w-4" />
                                No driver
                              </span>
                            )}
                            {totalValue && (
                              <span className="text-green-500 font-medium">
                                ${totalValue.toLocaleString()}
                              </span>
                            )}
                          </div>
                        </div>
                        <Badge className={status.color}>{status.label}</Badge>
                      </div>
                    </Link>

                    {/* Give Back form */}
                    {canGiveBack && (
                      <div className="mt-4 pt-4 border-t">
                        <GiveBackForm
                          loadId={load.id}
                          carrierId={carrierId}
                          reasonOptions={reasonOptions}
                          onGiveBack={handleGiveBack}
                        />
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Completed Loads */}
      {completedLoads.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2 text-muted-foreground">
            <CheckCircle className="h-5 w-5 text-green-500" />
            Completed ({completedLoads.length})
          </h2>

          <div className="space-y-2">
            {completedLoads.slice(0, 5).map((load) => {
              const company = Array.isArray(load.company)
                ? load.company[0]
                : load.company;
              const totalValue =
                load.carrier_rate && load.estimated_cuft
                  ? load.carrier_rate * load.estimated_cuft
                  : null;

              return (
                <Link key={load.id} href={`/dashboard/assigned-loads/${load.id}`}>
                  <Card className="hover:bg-muted/50 transition-colors cursor-pointer opacity-70">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                            <span>{company?.name}</span>
                            <span>-</span>
                            <span>{load.load_number}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium">
                              {load.origin_city}, {load.origin_state}
                            </p>
                            <ArrowRight className="h-4 w-4 text-muted-foreground" />
                            <p className="font-medium">
                              {load.destination_city}, {load.destination_state}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge className="bg-green-500/20 text-green-400">
                            Delivered
                          </Badge>
                          {totalValue && (
                            <p className="text-sm text-green-500 font-medium mt-1">
                              ${totalValue.toLocaleString()}
                            </p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty State */}
      {loads.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <Truck className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No assigned loads</h3>
            <p className="text-muted-foreground mb-4">
              Browse the load board to find loads and submit requests
            </p>
            <Button asChild>
              <Link href="/dashboard/load-board">
                <Package className="h-4 w-4 mr-2" />
                Browse Load Board
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
