import { getCurrentUser, createClient } from '@/lib/supabase-server';
import { redirect } from 'next/navigation';
import { getRevenueReport, getRevenueByCustomer, getRevenueByLane } from '@/data/reports';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, DollarSign, Building2, MapPin, ArrowRight } from 'lucide-react';

interface PageProps {
  searchParams: Promise<{ start?: string; end?: string; period?: string }>;
}

export default async function RevenueReportPage({ searchParams }: PageProps) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const supabase = await createClient();
  const params = await searchParams;

  // Get user's carrier company
  const { data: company } = await supabase
    .from('companies')
    .select('id')
    .eq('owner_id', user.id)
    .eq('is_carrier', true)
    .single();

  if (!company) {
    return (
      <div className="container py-6">
        <div className="text-center py-12">
          <DollarSign className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">No Carrier Company Found</h2>
          <p className="text-muted-foreground">
            Revenue reports require a carrier company to be set up.
          </p>
        </div>
      </div>
    );
  }

  // Default date range: last 6 months
  const endDate = params.end || new Date().toISOString().split('T')[0];
  const startDate =
    params.start || new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const groupBy = (params.period as 'day' | 'week' | 'month') || 'month';

  const [revenueData, customerData, laneData] = await Promise.all([
    getRevenueReport(company.id, startDate, endDate, groupBy),
    getRevenueByCustomer(company.id, startDate, endDate),
    getRevenueByLane(company.id, startDate, endDate),
  ]);

  const totals = {
    revenue: revenueData.reduce((sum, r) => sum + r.total_revenue, 0),
    loads: revenueData.reduce((sum, r) => sum + r.load_count, 0),
    cuft: revenueData.reduce((sum, r) => sum + r.total_cuft, 0),
  };

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
            <DollarSign className="h-6 w-6 text-green-500" />
            Revenue Report
          </h1>
          <p className="text-muted-foreground">
            {new Date(startDate).toLocaleDateString()} - {new Date(endDate).toLocaleDateString()}
          </p>
        </div>

        {/* Date Filter */}
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
          <select
            name="period"
            defaultValue={groupBy}
            className="border rounded px-2 py-1 text-sm bg-background"
          >
            <option value="day">Daily</option>
            <option value="week">Weekly</option>
            <option value="month">Monthly</option>
          </select>
          <Button type="submit" size="sm">
            Apply
          </Button>
        </form>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Total Revenue</p>
            <p className="text-2xl md:text-3xl font-bold text-green-500">
              ${totals.revenue.toLocaleString()}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Loads Delivered</p>
            <p className="text-2xl md:text-3xl font-bold">{totals.loads}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Total CUFT</p>
            <p className="text-2xl md:text-3xl font-bold">{totals.cuft.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Avg per Load</p>
            <p className="text-2xl md:text-3xl font-bold">
              ${totals.loads > 0 ? Math.round(totals.revenue / totals.loads).toLocaleString() : 0}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="timeline">
        <TabsList>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="customers">By Customer</TabsTrigger>
          <TabsTrigger value="lanes">By Lane</TabsTrigger>
        </TabsList>

        {/* Timeline */}
        <TabsContent value="timeline" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Revenue Over Time</CardTitle>
            </CardHeader>
            <CardContent>
              {revenueData.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No data for selected period
                </p>
              ) : (
                <div className="space-y-2">
                  {revenueData.map((row) => {
                    const maxRevenue = Math.max(...revenueData.map((r) => r.total_revenue));
                    const barWidth = maxRevenue > 0 ? (row.total_revenue / maxRevenue) * 100 : 0;

                    return (
                      <div key={row.period} className="flex items-center gap-4">
                        <div className="w-20 md:w-24 text-sm text-muted-foreground shrink-0">
                          {row.period}
                        </div>
                        <div className="flex-1 bg-muted rounded-full h-8 overflow-hidden">
                          <div
                            className="bg-green-500 h-full flex items-center justify-end px-2"
                            style={{ width: `${Math.max(barWidth, 5)}%` }}
                          >
                            <span className="text-xs text-white font-medium">
                              ${row.total_revenue.toLocaleString()}
                            </span>
                          </div>
                        </div>
                        <div className="w-16 md:w-20 text-sm text-right shrink-0">
                          {row.load_count} loads
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* By Customer */}
        <TabsContent value="customers" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Revenue by Customer
              </CardTitle>
            </CardHeader>
            <CardContent>
              {customerData.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No customer data for selected period
                </p>
              ) : (
                <div className="space-y-3">
                  {customerData.map((customer, index) => (
                    <div
                      key={customer.company_id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-lg font-bold text-muted-foreground">#{index + 1}</span>
                        <div>
                          <p className="font-medium">{customer.company_name}</p>
                          <p className="text-sm text-muted-foreground">
                            {customer.load_count} loads &bull; Avg $
                            {customer.avg_revenue_per_load.toLocaleString()}/load
                          </p>
                        </div>
                      </div>
                      <p className="text-xl font-bold text-green-500">
                        ${customer.total_revenue.toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* By Lane */}
        <TabsContent value="lanes" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Revenue by Lane
              </CardTitle>
            </CardHeader>
            <CardContent>
              {laneData.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No lane data for selected period
                </p>
              ) : (
                <div className="space-y-3">
                  {laneData.map((lane, index) => (
                    <div
                      key={`${lane.origin_state}-${lane.destination_state}`}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-lg font-bold text-muted-foreground">#{index + 1}</span>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{lane.origin_state}</span>
                          <ArrowRight className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{lane.destination_state}</span>
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {lane.load_count} loads &bull; {lane.total_miles.toLocaleString()} mi
                        </span>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-bold text-green-500">
                          ${lane.total_revenue.toLocaleString()}
                        </p>
                        {lane.avg_revenue_per_mile > 0 && (
                          <p className="text-sm text-muted-foreground">
                            ${lane.avg_revenue_per_mile.toFixed(2)}/mi
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
