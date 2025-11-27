import { getCurrentUser } from '@/lib/supabase-server';
import { redirect } from 'next/navigation';
import { getDriverPerformanceReport } from '@/data/reports';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Users } from 'lucide-react';
import { DriversExport } from './drivers-export';

interface PageProps {
  searchParams: Promise<{ start?: string; end?: string }>;
}

export default async function DriverPerformanceReportPage({ searchParams }: PageProps) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const params = await searchParams;

  const endDate = params.end || new Date().toISOString().split('T')[0];
  const startDate =
    params.start || new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const driverData = await getDriverPerformanceReport(user.id, startDate, endDate);

  const totals = {
    trips: driverData.reduce((sum, d) => sum + d.trip_count, 0),
    loads: driverData.reduce((sum, d) => sum + d.load_count, 0),
    miles: driverData.reduce((sum, d) => sum + d.total_miles, 0),
    revenue: driverData.reduce((sum, d) => sum + d.total_revenue_generated, 0),
    pay: driverData.reduce((sum, d) => sum + d.total_pay, 0),
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
            <Users className="h-6 w-6 text-purple-500" />
            Driver Performance
          </h1>
          <p className="text-muted-foreground">
            {new Date(startDate).toLocaleDateString()} - {new Date(endDate).toLocaleDateString()}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
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
          <DriversExport
            drivers={driverData.map((d) => ({
              driver_name: d.driver_name,
              trip_count: d.trip_count,
              load_count: d.load_count,
              total_miles: d.total_miles,
              total_revenue_generated: d.total_revenue_generated,
              total_pay: d.total_pay,
              avg_pay_per_trip: d.avg_pay_per_trip,
            }))}
            dateRange={`${new Date(startDate).toLocaleDateString()} - ${new Date(endDate).toLocaleDateString()}`}
          />
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Drivers</p>
            <p className="text-2xl font-bold">{driverData.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Total Trips</p>
            <p className="text-2xl font-bold">{totals.trips}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Total Loads</p>
            <p className="text-2xl font-bold">{totals.loads}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Total Miles</p>
            <p className="text-2xl font-bold">{totals.miles.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Total Pay</p>
            <p className="text-2xl font-bold text-orange-500">${totals.pay.toLocaleString()}</p>
          </CardContent>
        </Card>
      </div>

      {/* Driver Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {driverData.length === 0 ? (
          <Card className="col-span-full">
            <CardContent className="p-8 text-center">
              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No driver data for selected period</p>
            </CardContent>
          </Card>
        ) : (
          driverData.map((driver, index) => (
            <Card key={driver.driver_id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
                      <span className="font-bold text-purple-500">#{index + 1}</span>
                    </div>
                    <div>
                      <p className="font-semibold">{driver.driver_name}</p>
                      <p className="text-sm text-muted-foreground">
                        {driver.trip_count} trips &bull; {driver.load_count} loads
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold text-orange-500">
                      ${driver.total_pay.toLocaleString()}
                    </p>
                    <p className="text-sm text-muted-foreground">total pay</p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 pt-4 border-t">
                  <div className="text-center">
                    <p className="text-lg font-semibold">{driver.total_miles.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">miles</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-semibold text-green-500">
                      ${driver.total_revenue_generated.toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground">revenue generated</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-semibold">${driver.avg_pay_per_trip.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">avg/trip</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
