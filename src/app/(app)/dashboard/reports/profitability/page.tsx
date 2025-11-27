import { getCurrentUser } from '@/lib/supabase-server';
import { redirect } from 'next/navigation';
import { getTripProfitabilityReport } from '@/data/reports';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, TrendingUp, TrendingDown } from 'lucide-react';

interface PageProps {
  searchParams: Promise<{ start?: string; end?: string }>;
}

export default async function ProfitabilityReportPage({ searchParams }: PageProps) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const params = await searchParams;

  const endDate = params.end || new Date().toISOString().split('T')[0];
  const startDate =
    params.start || new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const { trips, summary } = await getTripProfitabilityReport(user.id, startDate, endDate);

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
            <TrendingUp className="h-6 w-6 text-blue-500" />
            Trip Profitability
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

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Trips</p>
            <p className="text-2xl font-bold">{summary.total_trips}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Revenue</p>
            <p className="text-2xl font-bold text-green-500">
              ${summary.total_revenue.toLocaleString()}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Costs</p>
            <p className="text-2xl font-bold text-red-500">
              ${summary.total_costs.toLocaleString()}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Driver Pay</p>
            <p className="text-2xl font-bold text-orange-500">
              ${summary.total_driver_pay.toLocaleString()}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Net Profit</p>
            <p
              className={`text-2xl font-bold ${summary.total_net_profit >= 0 ? 'text-green-500' : 'text-red-500'}`}
            >
              ${summary.total_net_profit.toLocaleString()}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Avg Margin</p>
            <p
              className={`text-2xl font-bold ${summary.avg_margin >= 0 ? 'text-green-500' : 'text-red-500'}`}
            >
              {summary.avg_margin.toFixed(1)}%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Profit/Loss Summary */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="border-green-500/30 bg-green-500/5">
          <CardContent className="p-4 flex items-center gap-4">
            <TrendingUp className="h-10 w-10 text-green-500" />
            <div>
              <p className="text-2xl font-bold">{summary.profitable_trips}</p>
              <p className="text-sm text-muted-foreground">Profitable Trips</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-red-500/30 bg-red-500/5">
          <CardContent className="p-4 flex items-center gap-4">
            <TrendingDown className="h-10 w-10 text-red-500" />
            <div>
              <p className="text-2xl font-bold">{summary.unprofitable_trips}</p>
              <p className="text-sm text-muted-foreground">Unprofitable Trips</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Trip List */}
      <Card>
        <CardHeader>
          <CardTitle>Trip Details</CardTitle>
        </CardHeader>
        <CardContent>
          {trips.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No completed trips in selected period
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Trip</th>
                    <th className="text-left p-2 hidden md:table-cell">Route</th>
                    <th className="text-right p-2">Revenue</th>
                    <th className="text-right p-2 hidden lg:table-cell">Costs</th>
                    <th className="text-right p-2 hidden lg:table-cell">Driver</th>
                    <th className="text-right p-2">Profit</th>
                    <th className="text-right p-2">Margin</th>
                    <th className="text-right p-2 hidden md:table-cell">$/Mile</th>
                  </tr>
                </thead>
                <tbody>
                  {trips.map((trip) => (
                    <tr key={trip.trip_id} className="border-b hover:bg-muted/50">
                      <td className="p-2">
                        <Link
                          href={`/dashboard/trips/${trip.trip_id}`}
                          className="font-medium hover:underline"
                        >
                          {trip.trip_number}
                        </Link>
                      </td>
                      <td className="p-2 text-muted-foreground hidden md:table-cell max-w-[200px] truncate">
                        {trip.route}
                      </td>
                      <td className="p-2 text-right text-green-500">
                        ${trip.total_revenue.toLocaleString()}
                      </td>
                      <td className="p-2 text-right text-red-500 hidden lg:table-cell">
                        ${trip.total_costs.toLocaleString()}
                      </td>
                      <td className="p-2 text-right text-orange-500 hidden lg:table-cell">
                        ${trip.driver_pay.toLocaleString()}
                      </td>
                      <td
                        className={`p-2 text-right font-medium ${trip.net_profit >= 0 ? 'text-green-500' : 'text-red-500'}`}
                      >
                        ${trip.net_profit.toLocaleString()}
                      </td>
                      <td className="p-2 text-right">
                        <Badge
                          className={
                            trip.profit_margin >= 0
                              ? 'bg-green-500/20 text-green-500'
                              : 'bg-red-500/20 text-red-500'
                          }
                        >
                          {trip.profit_margin.toFixed(1)}%
                        </Badge>
                      </td>
                      <td className="p-2 text-right text-muted-foreground hidden md:table-cell">
                        ${trip.revenue_per_mile.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
