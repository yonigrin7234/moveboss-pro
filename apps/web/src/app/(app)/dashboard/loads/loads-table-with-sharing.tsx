'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Copy,
  ExternalLink,
  Settings,
  Check,
  X,
  Globe,
  MessageCircle,
  MessageSquare,
  Truck,
  AlertCircle,
  Clock,
  CalendarClock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ShareLoadModal } from '@/components/sharing/ShareLoadModal';
import { AssignToTripModal } from '@/components/loads/AssignToTripModal';
import { useEntityUnreadCounts } from '@/hooks/useEntityUnreadCounts';
import { calculateRFDUrgency, getUrgencyBadgeLabel } from '@/lib/rfd-urgency';

interface Load {
  id: string;
  load_number: string | null;
  job_number?: string | null;
  internal_reference?: string | null;
  status: 'pending' | 'assigned' | 'in_transit' | 'delivered' | 'canceled';
  service_type: string;
  pickup_city: string | null;
  pickup_state: string | null;
  delivery_city: string | null;
  delivery_state: string | null;
  dropoff_city?: string | null;
  dropoff_state?: string | null;
  delivery_date: string | null;
  first_available_date?: string | null;
  cubic_feet: number | null;
  cubic_feet_estimate?: number | null;
  rate_per_cuft: number | null;
  linehaul_amount?: number | null;
  posting_status?: string | null;
  is_marketplace_visible?: boolean | null;
  posting_type?: string | null;
  company_id?: string | null;
  company?: { id?: string; name: string } | { id?: string; name: string }[] | null;
  // RFD tracking fields
  rfd_date?: string | null;
  rfd_date_tbd?: boolean | null;
  trip_id?: string | null;
}

interface Trip {
  id: string;
  trip_number: string | null;
  status: string;
  start_date: string | null;
  origin_city: string | null;
  origin_state: string | null;
  destination_city: string | null;
  destination_state: string | null;
  driver?: { id: string; first_name: string; last_name: string } | { id: string; first_name: string; last_name: string }[] | null;
  truck?: { id: string; unit_number: string } | { id: string; unit_number: string }[] | null;
  trailer?: { id: string; unit_number: string } | { id: string; unit_number: string }[] | null;
}

interface LoadsTableWithSharingProps {
  loads: Load[];
  publicBoardUrl: string | null;
  publicBoardSlug: string | null;
  userCompanyId: string | null;
  trips?: Trip[];
  onAssignToTrip?: (tripId: string, loadIds: string[]) => Promise<{ success: boolean; error?: string }>;
}

function formatStatus(status: Load['status']): string {
  switch (status) {
    case 'pending':
      return 'Pending';
    case 'assigned':
      return 'Assigned';
    case 'in_transit':
      return 'In Transit';
    case 'delivered':
      return 'Delivered';
    case 'canceled':
      return 'Canceled';
    default:
      return status;
  }
}

function formatServiceType(serviceType: string): string {
  switch (serviceType) {
    case 'hhg_local':
      return 'HHG Local';
    case 'hhg_long_distance':
      return 'HHG Long Distance';
    case 'commercial':
      return 'Commercial';
    case 'storage_in':
      return 'Storage In';
    case 'storage_out':
      return 'Storage Out';
    case 'freight':
      return 'Freight';
    case 'other':
      return 'Other';
    default:
      return serviceType;
  }
}

function formatCurrency(amount: number | null, compact = false): string {
  if (!amount) return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: compact ? 0 : 2,
    maximumFractionDigits: compact ? 0 : 2,
  }).format(amount);
}

function formatDate(date: string | null): string {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

export function LoadsTableWithSharing({
  loads,
  publicBoardUrl,
  publicBoardSlug,
  userCompanyId,
  trips = [],
  onAssignToTrip,
}: LoadsTableWithSharingProps) {
  const [selectedLoads, setSelectedLoads] = useState<Set<string>>(new Set());
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [shareLoadIds, setShareLoadIds] = useState<string[]>([]);
  const [copiedBoardUrl, setCopiedBoardUrl] = useState(false);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [assignLoadIds, setAssignLoadIds] = useState<string[]>([]);

  // Fetch unread message counts for loads
  const { getUnreadCount } = useEntityUnreadCounts('load');

  // Helper to determine if a load is from the user's own company
  const isOwnCompanyLoad = (load: Load): boolean => {
    if (!userCompanyId) return true; // If no company membership, treat all as own
    const loadCompanyId = load.company_id || (Array.isArray(load.company) ? load.company[0]?.id : load.company?.id);
    return loadCompanyId === userCompanyId;
  };

  // Pending loads can be selected (for trip assignment)
  const selectableLoads = loads.filter((l) => l.status === 'pending');
  // Only own company pending loads can be posted to marketplace
  const shareableLoads = selectableLoads.filter((l) => isOwnCompanyLoad(l));

  const allSelectableSelected =
    selectableLoads.length > 0 && selectableLoads.every((l) => selectedLoads.has(l.id));

  // Check if all selected loads can be shared (for floating bar button visibility)
  const selectedLoadsList = loads.filter((l) => selectedLoads.has(l.id));
  const canShareSelected = selectedLoadsList.length > 0 && selectedLoadsList.every((l) => isOwnCompanyLoad(l));
  const hasExternalSelected = selectedLoadsList.some((l) => !isOwnCompanyLoad(l));

  const toggleSelectAll = () => {
    if (allSelectableSelected) {
      setSelectedLoads(new Set());
    } else {
      setSelectedLoads(new Set(selectableLoads.map((l) => l.id)));
    }
  };

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedLoads);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedLoads(newSelected);
  };

  const openShareModal = (ids: string[]) => {
    setShareLoadIds(ids);
    setShareModalOpen(true);
  };

  const copyBoardUrl = async () => {
    if (!publicBoardUrl) return;
    try {
      await navigator.clipboard.writeText(publicBoardUrl);
      setCopiedBoardUrl(true);
      setTimeout(() => setCopiedBoardUrl(false), 2000);
    } catch (e) {
      console.error('Failed to copy:', e);
    }
  };

  const openAssignModal = (ids: string[]) => {
    setAssignLoadIds(ids);
    setAssignModalOpen(true);
  };

  // Normalize trips data (handle array vs single object for nested relations)
  const normalizedTrips = trips.map((t) => ({
    ...t,
    driver: Array.isArray(t.driver) ? t.driver[0] : t.driver,
    truck: Array.isArray(t.truck) ? t.truck[0] : t.truck,
    trailer: Array.isArray(t.trailer) ? t.trailer[0] : t.trailer,
  }));

  return (
    <>
      {/* Public Board Banner */}
      {publicBoardSlug && (
        <div className="mb-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
          <div className="flex items-center gap-4 p-4">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Globe className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-slate-900 dark:text-white text-sm">
                Public Load Board
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                {publicBoardUrl}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={copyBoardUrl}
                className="h-8 px-3 text-xs border-slate-200 dark:border-slate-700"
              >
                {copiedBoardUrl ? (
                  <>
                    <Check className="h-3.5 w-3.5 mr-1.5 text-emerald-600" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5 mr-1.5" />
                    Copy
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                size="sm"
                asChild
                className="h-8 px-3 text-xs border-slate-200 dark:border-slate-700"
              >
                <a href={publicBoardUrl || '#'} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                  Open
                </a>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                asChild
                className="h-8 px-3 text-xs"
              >
                <Link href="/dashboard/settings/public-board">
                  <Settings className="h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <Card className="border-slate-200 dark:border-slate-800">
        <CardContent className="p-0">
          {loads.length === 0 ? (
            <div className="p-10 text-center text-sm text-muted-foreground">
              <p className="mb-4">No loads yet. Add your first load to begin.</p>
              <Button asChild>
                <Link href="/dashboard/loads/new">Add Load</Link>
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-200 dark:border-slate-800">
                    <TableHead className="w-10">
                      <Checkbox
                        checked={allSelectableSelected}
                        onCheckedChange={toggleSelectAll}
                        aria-label="Select all pending loads"
                      />
                    </TableHead>
                    <TableHead>Load Number</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Service</TableHead>
                    <TableHead>Origin</TableHead>
                    <TableHead>Destination</TableHead>
                    <TableHead className="text-right">CUFT</TableHead>
                    <TableHead>RFD Date</TableHead>
                    <TableHead className="text-right">Rate</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-24"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loads.map((load) => {
                    const company = Array.isArray(load.company) ? load.company[0] : load.company;
                    const cuft = load.cubic_feet || load.cubic_feet_estimate;
                    const ratePerCuft = load.rate_per_cuft;
                    const linehaulTotal = load.linehaul_amount || (cuft && ratePerCuft ? cuft * ratePerCuft : null);
                    const isPosted = load.is_marketplace_visible || load.posting_status === 'posted';
                    const isExternal = !isOwnCompanyLoad(load);
                    // Pending loads can be selected (for trip assignment)
                    const isSelectable = load.status === 'pending';
                    // Only own company pending loads can be shared to marketplace
                    const isShareable = isSelectable && !isExternal;
                    const isSelected = selectedLoads.has(load.id);

                    return (
                      <TableRow
                        key={load.id}
                        className={`border-slate-100 dark:border-slate-800 ${isSelected ? 'bg-primary/5' : ''}`}
                      >
                        <TableCell>
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleSelect(load.id)}
                            disabled={!isSelectable}
                            aria-label={`Select load ${load.load_number}`}
                          />
                        </TableCell>
                        <TableCell className="font-medium">
                          <Link
                            href={`/dashboard/loads/${load.id}`}
                            className="text-foreground hover:text-primary"
                          >
                            {load.load_number || load.job_number}
                          </Link>
                          {load.internal_reference && (
                            <div className="text-xs text-muted-foreground mt-0.5">
                              Ref: {load.internal_reference}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          <div className="flex items-center gap-1.5">
                            {company?.name || '—'}
                            {isExternal && (
                              <Badge
                                variant="outline"
                                className="text-[10px] px-1.5 py-0 h-4 bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20"
                              >
                                External
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {formatServiceType(load.service_type)}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {load.pickup_city && load.pickup_state
                            ? `${load.pickup_city}, ${load.pickup_state}`
                            : '—'}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {load.delivery_city && load.delivery_state
                            ? `${load.delivery_city}, ${load.delivery_state}`
                            : load.dropoff_city && load.dropoff_state
                              ? `${load.dropoff_city}, ${load.dropoff_state}`
                              : '—'}
                        </TableCell>
                        <TableCell className="text-right text-sm">
                          {cuft ? cuft.toLocaleString() : '—'}
                        </TableCell>
                        <TableCell className="text-sm">
                          {(() => {
                            const urgency = calculateRFDUrgency({
                              rfd_date: load.rfd_date ?? null,
                              rfd_date_tbd: load.rfd_date_tbd ?? null,
                              trip_id: load.trip_id ?? null,
                            });
                            const label = getUrgencyBadgeLabel(urgency);
                            const Icon = urgency.level === 'critical' ? AlertCircle
                              : urgency.level === 'urgent' ? Clock
                              : urgency.level === 'approaching' ? CalendarClock
                              : null;

                            return (
                              <div className="flex items-center gap-1.5">
                                <Badge
                                  variant={urgency.badgeVariant}
                                  className={`${urgency.colorClass} text-[10px] px-1.5 py-0 h-5`}
                                >
                                  {Icon && <Icon className="h-3 w-3 mr-1" />}
                                  {label}
                                </Badge>
                                {urgency.level !== 'tbd' && load.rfd_date && (
                                  <span className="text-xs text-muted-foreground">
                                    {formatDate(load.rfd_date)}
                                  </span>
                                )}
                              </div>
                            );
                          })()}
                        </TableCell>
                        <TableCell className="text-right">
                          {ratePerCuft ? (
                            <div className="space-y-0.5">
                              <div className="text-sm font-medium">
                                ${ratePerCuft.toFixed(2)}/cuft
                              </div>
                              {isPosted && linehaulTotal && (
                                <div className="text-xs text-muted-foreground">
                                  {formatCurrency(linehaulTotal, true)} total
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <Badge
                              variant="secondary"
                              className={
                                load.status === 'delivered'
                                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                  : load.status === 'canceled'
                                    ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                                    : load.status === 'in_transit'
                                      ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                                      : load.status === 'assigned'
                                        ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                              }
                            >
                              {formatStatus(load.status)}
                            </Badge>
                            {isPosted && (
                              <Badge
                                variant="outline"
                                className="text-[10px] px-1.5 py-0 h-4 bg-primary/5 text-primary border-primary/20"
                              >
                                <Globe className="h-2.5 w-2.5 mr-1" />
                                Load Board
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {/* Messages button with unread badge */}
                            {(() => {
                              const unreadCount = getUnreadCount(load.id);
                              return (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  asChild
                                  className={`h-8 w-8 relative ${
                                    unreadCount > 0
                                      ? 'text-primary'
                                      : 'text-slate-400 hover:text-slate-600'
                                  }`}
                                  title={unreadCount > 0 ? `${unreadCount} unread messages` : 'Messages'}
                                >
                                  <Link href={`/dashboard/loads/${load.id}?tab=messages`}>
                                    <MessageSquare className="h-4 w-4" />
                                    {unreadCount > 0 && (
                                      <span className="absolute -top-1 -right-1 h-4 min-w-4 flex items-center justify-center bg-primary text-primary-foreground text-[10px] font-medium rounded-full px-1">
                                        {unreadCount > 99 ? '99+' : unreadCount}
                                      </span>
                                    )}
                                  </Link>
                                </Button>
                              );
                            })()}
                            {isShareable && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-slate-500 hover:text-primary"
                                onClick={() => openShareModal([load.id])}
                                title="Share via WhatsApp"
                              >
                                <MessageCircle className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              asChild
                              className="h-8 px-2 text-xs"
                            >
                              <Link href={`/dashboard/loads/${load.id}`}>Edit</Link>
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Floating Selection Bar */}
      {selectedLoads.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
          <div className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-2xl rounded-full px-2 py-2 flex items-center gap-2">
            <span className="text-sm font-medium px-3">
              {selectedLoads.size} selected
              {hasExternalSelected && (
                <span className="text-orange-400 dark:text-orange-500 text-xs ml-1">
                  (includes external)
                </span>
              )}
            </span>
            {onAssignToTrip && (
              <Button
                size="sm"
                onClick={() => openAssignModal(Array.from(selectedLoads))}
                className="rounded-full bg-primary hover:bg-primary/90 text-white h-9 px-4 gap-2"
              >
                <Truck className="h-4 w-4" />
                Assign to Trip
              </Button>
            )}
            {canShareSelected ? (
              <Button
                size="sm"
                onClick={() => openShareModal(Array.from(selectedLoads))}
                className="rounded-full bg-[#25D366] hover:bg-[#20BD5A] text-white h-9 px-4 gap-2"
              >
                <MessageCircle className="h-4 w-4" />
                Share via WhatsApp
              </Button>
            ) : (
              <Button
                size="sm"
                disabled
                className="rounded-full bg-slate-600 text-slate-400 h-9 px-4 gap-2 cursor-not-allowed"
                title="Cannot share external company loads to marketplace"
              >
                <MessageCircle className="h-4 w-4" />
                Share via WhatsApp
              </Button>
            )}
            <button
              onClick={() => setSelectedLoads(new Set())}
              className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/10 dark:hover:bg-slate-900/10 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Share Modal */}
      <ShareLoadModal
        loadIds={shareLoadIds}
        isOpen={shareModalOpen}
        onClose={() => {
          setShareModalOpen(false);
          setShareLoadIds([]);
        }}
      />

      {/* Assign to Trip Modal */}
      {onAssignToTrip && (
        <AssignToTripModal
          loadIds={assignLoadIds}
          isOpen={assignModalOpen}
          onClose={() => {
            setAssignModalOpen(false);
            setAssignLoadIds([]);
            setSelectedLoads(new Set());
          }}
          onAssign={onAssignToTrip}
          trips={normalizedTrips}
        />
      )}
    </>
  );
}
