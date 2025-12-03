'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Share2,
  Copy,
  ExternalLink,
  Settings,
  Check,
  X,
  Globe,
  MessageCircle,
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
  company?: { name: string } | { name: string }[] | null;
}

interface LoadsTableWithSharingProps {
  loads: Load[];
  publicBoardUrl: string | null;
  publicBoardSlug: string | null;
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
}: LoadsTableWithSharingProps) {
  const [selectedLoads, setSelectedLoads] = useState<Set<string>>(new Set());
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [shareLoadIds, setShareLoadIds] = useState<string[]>([]);
  const [copiedBoardUrl, setCopiedBoardUrl] = useState(false);

  // Filter only pending loads for selection (only open loads can be shared)
  const shareableLoads = loads.filter((l) => l.status === 'pending');
  const allShareableSelected =
    shareableLoads.length > 0 && shareableLoads.every((l) => selectedLoads.has(l.id));

  const toggleSelectAll = () => {
    if (allShareableSelected) {
      setSelectedLoads(new Set());
    } else {
      setSelectedLoads(new Set(shareableLoads.map((l) => l.id)));
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
                        checked={allShareableSelected}
                        onCheckedChange={toggleSelectAll}
                        aria-label="Select all shareable loads"
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
                    const isPosted = load.posting_status === 'posted';
                    const isShareable = load.status === 'pending';
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
                            disabled={!isShareable}
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
                          {company?.name || '—'}
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
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDate(load.delivery_date || load.first_available_date || null)}
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
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
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
            </span>
            <Button
              size="sm"
              onClick={() => openShareModal(Array.from(selectedLoads))}
              className="rounded-full bg-[#25D366] hover:bg-[#20BD5A] text-white h-9 px-4 gap-2"
            >
              <MessageCircle className="h-4 w-4" />
              Share via WhatsApp
            </Button>
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
    </>
  );
}
