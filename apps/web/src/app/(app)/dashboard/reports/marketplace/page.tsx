import { getCurrentUser, createClient } from '@/lib/supabase-server';
import { redirect } from 'next/navigation';
import { getMarketplaceReport } from '@/data/reports';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft,
  Store,
  CheckCircle,
  XCircle,
  Clock,
  TrendingUp,
  Package,
  DollarSign,
} from 'lucide-react';

interface PageProps {
  searchParams: Promise<{ start?: string; end?: string }>;
}

export default async function MarketplaceReportPage({ searchParams }: PageProps) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const supabase = await createClient();
  const params = await searchParams;

  // Get user's carrier company (must be their workspace company)
  const { data: company } = await supabase
    .from('companies')
    .select('id')
    .eq('owner_id', user.id)
    .eq('is_workspace_company', true)
    .eq('is_carrier', true)
    .single();

  if (!company) {
    return (
      <div className="container py-6">
        <Button variant="ghost" size="sm" asChild className="mb-4">
          <Link href="/dashboard/reports">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Reports
          </Link>
        </Button>
        <div className="text-center py-12">
          <Store className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">No Carrier Company Found</h2>
          <p className="text-muted-foreground">
            Marketplace reports require a carrier company to be set up.
          </p>
        </div>
      </div>
    );
  }

  const endDate = params.end || new Date().toISOString().split('T')[0];
  const startDate =
    params.start || new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const data = await getMarketplaceReport(company.id, startDate, endDate);

  return (
    <div className="container py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <Button variant="ghost" size="sm" asChild className="mb-2">
            <Link href="/dashboard/reports">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Reports
            </Link>
          </Button>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Store className="h-6 w-6 text-cyan-500" />
            Marketplace Activity
          </h1>
          <p className="text-muted-foreground">
            {new Date(startDate).toLocaleDateString()} - {new Date(endDate).toLocaleDateString()}
          </p>
        </div>

        <form className="flex flex-wrap items-center gap-2">
          <input
            type="date"
            name="start"
            defaultValue={startDate}
            className="border rounded px-2 py-1 text-sm bg-background"
          />
          <span className="text-muted-foreground">to</span>
          <input
            type="date"
            name="end"
            defaultValue={endDate}
            className="border rounded px-2 py-1 text-sm bg-background"
          />
          <Button type="submit" size="sm">
            Apply
          </Button>
        </form>
      </div>

      {/* Request Stats */}
      <Card>
        <CardHeader>
          <CardTitle>Load Requests</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="text-center p-4 border rounded-lg">
              <p className="text-3xl font-bold">{data.total_requests}</p>
              <p className="text-sm text-muted-foreground">Total Requests</p>
            </div>
            <div className="text-center p-4 border rounded-lg border-green-500/30 bg-green-500/5">
              <div className="flex items-center justify-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <p className="text-3xl font-bold text-green-500">{data.accepted_requests}</p>
              </div>
              <p className="text-sm text-muted-foreground">Accepted</p>
            </div>
            <div className="text-center p-4 border rounded-lg border-red-500/30 bg-red-500/5">
              <div className="flex items-center justify-center gap-2">
                <XCircle className="h-5 w-5 text-red-500" />
                <p className="text-3xl font-bold text-red-500">{data.declined_requests}</p>
              </div>
              <p className="text-sm text-muted-foreground">Declined</p>
            </div>
            <div className="text-center p-4 border rounded-lg border-yellow-500/30 bg-yellow-500/5">
              <div className="flex items-center justify-center gap-2">
                <Clock className="h-5 w-5 text-yellow-500" />
                <p className="text-3xl font-bold text-yellow-500">{data.pending_requests}</p>
              </div>
              <p className="text-sm text-muted-foreground">Pending</p>
            </div>
            <div className="text-center p-4 border rounded-lg border-blue-500/30 bg-blue-500/5">
              <div className="flex items-center justify-center gap-2">
                <TrendingUp className="h-5 w-5 text-blue-500" />
                <p className="text-3xl font-bold text-blue-500">{data.acceptance_rate}%</p>
              </div>
              <p className="text-sm text-muted-foreground">Acceptance Rate</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Load Performance */}
      <Card>
        <CardHeader>
          <CardTitle>Load Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 border rounded-lg">
              <div className="flex items-center justify-center gap-2">
                <Package className="h-5 w-5 text-green-500" />
                <p className="text-3xl font-bold">{data.loads_completed}</p>
              </div>
              <p className="text-sm text-muted-foreground">Loads Completed</p>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="flex items-center justify-center gap-2">
                <XCircle className="h-5 w-5 text-red-500" />
                <p className="text-3xl font-bold">{data.loads_cancelled}</p>
              </div>
              <p className="text-sm text-muted-foreground">Loads Cancelled</p>
            </div>
            <div className="text-center p-4 border rounded-lg border-green-500/30 bg-green-500/5">
              <div className="flex items-center justify-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <p className="text-3xl font-bold text-green-500">{data.reliability_rate}%</p>
              </div>
              <p className="text-sm text-muted-foreground">Reliability Rate</p>
            </div>
            <div className="text-center p-4 border rounded-lg border-green-500/30 bg-green-500/5">
              <div className="flex items-center justify-center gap-2">
                <DollarSign className="h-5 w-5 text-green-500" />
                <p className="text-3xl font-bold text-green-500">
                  ${data.total_revenue.toLocaleString()}
                </p>
              </div>
              <p className="text-sm text-muted-foreground">Total Revenue</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Performance Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Performance Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Acceptance Rate Bar */}
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm font-medium">Acceptance Rate</span>
                <span className="text-sm text-muted-foreground">{data.acceptance_rate}%</span>
              </div>
              <div className="h-3 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full"
                  style={{ width: `${data.acceptance_rate}%` }}
                />
              </div>
            </div>

            {/* Reliability Rate Bar */}
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm font-medium">Reliability Rate</span>
                <span className="text-sm text-muted-foreground">{data.reliability_rate}%</span>
              </div>
              <div className="h-3 bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${
                    data.reliability_rate >= 90
                      ? 'bg-green-500'
                      : data.reliability_rate >= 70
                        ? 'bg-yellow-500'
                        : 'bg-red-500'
                  }`}
                  style={{ width: `${data.reliability_rate}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {data.reliability_rate >= 90
                  ? 'Excellent - Keep up the great work!'
                  : data.reliability_rate >= 70
                    ? 'Good - There is room for improvement'
                    : 'Needs Attention - High cancellation rate may affect future load offers'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
