import Link from 'next/link';
import { redirect } from 'next/navigation';

import {
  getCompaniesForUser,
  getCompaniesCountForUser,
  type Company,
} from '@/data/companies';
import { getDriversForUser, getDriverStatsForUser, type Driver } from '@/data/drivers';
import { getCurrentUser } from '@/lib/supabase-server';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const recentTrips = [
  {
    id: 'TRP-1042',
    company: 'Zenith Freight',
    status: 'En Route',
    driver: 'Marta Jenkins',
    date: 'Nov 20, 2025',
  },
  {
    id: 'TRP-1037',
    company: 'Blue Mountain Foods',
    status: 'Completed',
    driver: 'Andre Gomez',
    date: 'Nov 18, 2025',
  },
  {
    id: 'TRP-1031',
    company: 'AeroParts Inc.',
    status: 'Planned',
    driver: 'Alana Pierce',
    date: 'Nov 22, 2025',
  },
  {
    id: 'TRP-1025',
    company: 'Summit Goods',
    status: 'Delayed',
    driver: 'Liam Ford',
    date: 'Nov 17, 2025',
  },
];

const statusStyles: Record<string, string> = {
  'En Route': 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  Completed: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  Planned: 'bg-sky-500/10 text-sky-600 dark:text-sky-400',
  Delayed: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
};

export default async function DashboardPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  let companies: Company[] = [];
  let totalCompanies = 0;
  let drivers: Driver[] = [];
  let driverStats = { totalDrivers: 0, activeDrivers: 0, suspendedDrivers: 0 };
  let error: string | null = null;

  try {
    [companies, totalCompanies, drivers, driverStats] = await Promise.all([
      getCompaniesForUser(user.id).then((cs) => cs.slice(0, 5)),
      getCompaniesCountForUser(user.id),
      getDriversForUser(user.id).then((ds) => ds.slice(0, 5)),
      getDriverStatsForUser(user.id),
    ]);
  } catch (err) {
    error = err instanceof Error ? err.message : 'Failed to load companies';
  }

  const statCards = [
    {
      label: 'Companies',
      value: totalCompanies || 0,
      description: 'Accounts across your network',
    },
    {
      label: 'Active Trips',
      value: 4,
      description: 'Trips in progress today',
    },
    {
      label: 'Available Drivers',
      value: driverStats.activeDrivers || 0,
      description: 'Ready for dispatch',
    },
    {
      label: 'Open Capacity',
      value: '38k',
      description: 'Cubic ft. available',
    },
  ];

  return (
    <div className="space-y-6 w-full">
      <div className="space-y-1">
        <p className="text-sm text-muted-foreground">
          Welcome back, {user.email ?? 'fleet owner'}
        </p>
        <p className="text-xs text-muted-foreground">
          Track performance, assets, and partner data from a single view.
        </p>
      </div>

      {error && (
        <Card className="border-destructive bg-destructive/10">
          <CardContent className="pt-6 text-sm text-destructive">
            Error loading companies: {error}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {statCards.map((stat) => (
          <Card key={stat.label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold text-foreground">{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex flex-col gap-4 lg:flex-row">
        <Card className="lg:flex-[3]">
          <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-lg">Recent Companies</CardTitle>
              <p className="text-sm text-muted-foreground">
                Last five accounts you touched
              </p>
            </div>
            <Button asChild size="sm" variant="outline">
              <Link href="/dashboard/companies">View all</Link>
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {companies.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">
                No companies yet. Add partners to unlock reporting.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>DOT</TableHead>
                      <TableHead>MC</TableHead>
                      <TableHead>Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {companies.map((company) => (
                      <TableRow key={company.id}>
                        <TableCell className="font-medium">
                          <Link
                            href={`/dashboard/companies/${company.id}`}
                            className="text-foreground hover:text-primary"
                          >
                            {company.name}
                          </Link>
                        </TableCell>
                        <TableCell>{company.dot_number ?? '—'}</TableCell>
                        <TableCell>{company.mc_number ?? '—'}</TableCell>
                        <TableCell>
                          {new Date(company.created_at).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:flex-[2]">
          <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-lg">Driver roster</CardTitle>
              <p className="text-sm text-muted-foreground">
                Recent drivers ready for dispatch
              </p>
            </div>
            <Button asChild size="sm" variant="ghost">
              <Link href="/dashboard/drivers">View drivers</Link>
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {drivers.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">
                No drivers yet. Add one to see them here.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Driver</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead className="text-right">Pay mode</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {drivers.map((driver) => (
                      <TableRow key={driver.id}>
                        <TableCell className="font-medium">
                          <Link
                            href={`/dashboard/drivers/${driver.id}`}
                            className="text-foreground hover:text-primary"
                          >
                            {driver.first_name} {driver.last_name}
                          </Link>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="capitalize">
                            {driver.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {driver.phone}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {driver.pay_mode?.replaceAll('_', ' ') || '—'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
