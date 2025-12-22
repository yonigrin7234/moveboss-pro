import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getCurrentUser, getCurrentUserPermissions } from '@/lib/supabase-server';
import { AccessDenied } from '@/components/access-denied';
import {
  getDriversForUser,
  getDriverStatsForUser,
  type Driver,
  type DriverFilters,
  type DriverStatus,
} from '@/data/drivers';

// Force dynamic rendering to ensure fresh data after updates
export const dynamic = 'force-dynamic';
import { getPrimaryCompanyForUser } from '@/data/companies';
import { getCompanyDriverDispatchConversations } from '@/data/conversations';
import { DriverListFilters } from './driver-list-filters';
import { DriverMessagesTab } from './driver-messages-tab';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatFullName } from '@/lib/utils';
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';

function formatStatus(status: Driver['status']): string {
  switch (status) {
    case 'active':
      return 'Active';
    case 'inactive':
      return 'Inactive';
    case 'suspended':
      return 'Suspended';
    default:
      return status;
  }
}

function formatDate(dateString: string | null): string {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

import { formatPayMode } from '@/data/drivers';

function formatCompensation(driver: Driver): string {
  switch (driver.pay_mode) {
    case 'per_mile':
      return driver.rate_per_mile != null ? `$${driver.rate_per_mile.toFixed(2)} / mile` : '-';
    case 'per_cuft':
      return driver.rate_per_cuft != null ? `$${driver.rate_per_cuft.toFixed(2)} / cf` : '-';
    case 'per_mile_and_cuft':
      const mile = driver.rate_per_mile != null ? driver.rate_per_mile.toFixed(2) : '0';
      const cubic = driver.rate_per_cuft != null ? driver.rate_per_cuft.toFixed(2) : '0';
      return `$${mile} / mile + $${cubic} / cf`;
    case 'percent_of_revenue':
      return driver.percent_of_revenue != null ? `${driver.percent_of_revenue.toFixed(1)}% of revenue` : '-';
    case 'flat_daily_rate':
      return driver.flat_daily_rate != null ? `$${driver.flat_daily_rate.toFixed(2)} / day` : '-';
    default:
      return '-';
  }
}

interface DriversPageProps {
  searchParams: Promise<{
    search?: string;
    status?: string;
  }>;
}

const DRIVER_STATUSES: readonly DriverStatus[] = ['active', 'inactive', 'suspended'] as const;

function isDriverStatus(value: string | undefined): value is DriverStatus {
  return value !== undefined && (DRIVER_STATUSES as readonly string[]).includes(value);
}

function isWithinDays(dateString: string | null, days: number): boolean {
  if (!dateString) return false;
  const now = new Date();
  const target = new Date(dateString);
  if (Number.isNaN(target.getTime())) return false;
  const diffMs = target.getTime() - now.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  return diffDays >= 0 && diffDays <= days;
}

export default async function DriversPage({ searchParams }: DriversPageProps) {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  const permissions = await getCurrentUserPermissions();
  if (!permissions?.can_manage_drivers) {
    return <AccessDenied message="You don't have permission to manage drivers." />;
  }

  const params = await searchParams;
  const primaryCompany = await getPrimaryCompanyForUser(user.id);
  const filters: DriverFilters = {
    search: params.search,
    status: isDriverStatus(params.status) ? params.status : 'all',
    companyId: primaryCompany?.id,
  };

  let drivers: Driver[] = [];
  let stats = { totalDrivers: 0, activeDrivers: 0, suspendedDrivers: 0 };
  let driverConversations: Awaited<ReturnType<typeof getCompanyDriverDispatchConversations>> = [];
  let error: string | null = null;

  try {
    [drivers, stats, driverConversations] = await Promise.all([
      getDriversForUser(user.id, filters),
      getDriverStatsForUser(user.id, primaryCompany?.id),
      primaryCompany?.id ? getCompanyDriverDispatchConversations(primaryCompany.id, user.id) : Promise.resolve([]),
    ]);
  } catch (err) {
    error = err instanceof Error ? err.message : 'Failed to load drivers';
  }

  const loginEnabled = drivers.filter((driver) => driver.has_login).length;
  const expiringLicenses = drivers.filter((driver) => isWithinDays(driver.license_expiry, 30)).length;
  const expiringMedical = drivers.filter((driver) => isWithinDays(driver.medical_card_expiry, 30)).length;
  const suspended = drivers.filter((driver) => driver.status === 'suspended').length;

  const payModeBreakdown = drivers.reduce<Record<string, number>>((acc, driver) => {
    acc[driver.pay_mode] = (acc[driver.pay_mode] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-2xl border bg-card px-5 py-6 shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            People · Drivers
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">Driver Workforce</h1>
            <Badge variant="secondary" className="bg-primary/10 text-primary">Roster</Badge>
          </div>
          <p className="text-sm text-muted-foreground max-w-2xl">
            One workspace for roster, compliance, portal access, and pay. Keep dispatch, HR, and safety on the same page.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button asChild>
              <Link href="/dashboard/drivers/new">Add driver</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/dashboard/trips">Assign to trips</Link>
            </Button>
          </div>
        </div>
        <div className="grid w-full max-w-lg grid-cols-2 gap-3">
          <Card className="border-primary/30">
            <CardContent className="py-3">
              <p className="text-[11px] uppercase tracking-[0.1em] text-muted-foreground">Active</p>
              <p className="text-2xl font-semibold text-foreground">{stats.activeDrivers}</p>
              <p className="text-xs text-muted-foreground">{stats.totalDrivers} total roster</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-3">
              <p className="text-[11px] uppercase tracking-[0.1em] text-muted-foreground">Portal access</p>
              <p className="text-2xl font-semibold text-foreground">{loginEnabled}</p>
              <p className="text-xs text-muted-foreground">Drivers with logins</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-3">
              <p className="text-[11px] uppercase tracking-[0.1em] text-muted-foreground">Licenses expiring</p>
              <p className="text-2xl font-semibold text-foreground">{expiringLicenses}</p>
              <p className="text-xs text-muted-foreground">Within 30 days</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-3">
              <p className="text-[11px] uppercase tracking-[0.1em] text-muted-foreground">Suspended</p>
              <p className="text-2xl font-semibold text-rose-600 dark:text-rose-400">{suspended}</p>
              <p className="text-xs text-muted-foreground">Needs attention</p>
            </CardContent>
          </Card>
        </div>
      </div>

      <DriverListFilters initialFilters={filters} />

      {error && (
        <Card className="border-destructive bg-destructive/10">
          <CardContent className="pt-6 text-sm text-destructive">
            {error}
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="roster" className="space-y-4">
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="roster">Roster</TabsTrigger>
          <TabsTrigger value="messages">Messages</TabsTrigger>
          <TabsTrigger value="compliance">Compliance</TabsTrigger>
          <TabsTrigger value="access">Access</TabsTrigger>
          <TabsTrigger value="compensation">Compensation</TabsTrigger>
        </TabsList>

        <TabsContent value="roster">
          <Card>
            <CardHeader className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="text-lg">Driver roster</CardTitle>
                <p className="text-sm text-muted-foreground">Contact, status, and current assignments.</p>
              </div>
              <Button asChild size="sm" variant="outline">
                <Link href="/dashboard/drivers/new">Add driver</Link>
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {drivers.length === 0 ? (
                <div className="p-10 text-center text-sm text-muted-foreground">
                  No drivers yet. Click &quot;Add driver&quot; to create your first one.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Driver</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Pay Mode</TableHead>
                      <TableHead>Truck</TableHead>
                      <TableHead>Trailer</TableHead>
                      <TableHead>License Exp.</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {drivers.map((driver) => (
                      <TableRow key={driver.id}>
                        <TableCell className="font-medium">
                          <div className="flex flex-col">
                            <Link
                              href={`/dashboard/drivers/${driver.id}`}
                              className="text-foreground hover:text-primary"
                            >
                              {formatFullName(driver.first_name, driver.last_name)}
                            </Link>
                            <span className="text-xs text-muted-foreground">{driver.email || 'No email'}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="secondary"
                            className={
                              driver.status === 'active'
                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                                : driver.status === 'suspended'
                                  ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
                                  : 'bg-muted text-muted-foreground'
                            }
                          >
                            {formatStatus(driver.status)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{driver.phone}</TableCell>
                        <TableCell className="text-muted-foreground">{formatPayMode(driver.pay_mode)}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {driver.assigned_truck_id ? 'Assigned' : 'Unassigned'}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {driver.assigned_trailer_id ? 'Assigned' : 'Unassigned'}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatDate(driver.license_expiry)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" asChild>
                            <Link href={`/dashboard/drivers/${driver.id}`}>Open</Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="messages">
          <DriverMessagesTab
            drivers={drivers}
            conversations={driverConversations}
            companyId={primaryCompany?.id ?? ''}
            userId={user.id}
          />
        </TabsContent>

        <TabsContent value="compliance">
          <Card>
            <CardHeader className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="text-lg">Compliance view</CardTitle>
                <p className="text-sm text-muted-foreground">Licenses and medical expirations by driver.</p>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {drivers.length === 0 ? (
                <div className="p-10 text-center text-sm text-muted-foreground">No drivers yet.</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Driver</TableHead>
                      <TableHead>License #</TableHead>
                      <TableHead>State</TableHead>
                      <TableHead>License Exp.</TableHead>
                      <TableHead>Medical Exp.</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {drivers.map((driver) => {
                      const licenseWarn = isWithinDays(driver.license_expiry, 30);
                      const medicalWarn = isWithinDays(driver.medical_card_expiry, 30);
                      return (
                        <TableRow key={driver.id}>
                          <TableCell className="font-medium">{formatFullName(driver.first_name, driver.last_name)}</TableCell>
                          <TableCell className="text-muted-foreground">{driver.license_number}</TableCell>
                          <TableCell className="text-muted-foreground">{driver.license_state || '-'}</TableCell>
                          <TableCell className={licenseWarn ? 'text-amber-600 font-medium' : 'text-muted-foreground'}>
                            {formatDate(driver.license_expiry)}
                          </TableCell>
                          <TableCell className={medicalWarn ? 'text-amber-600 font-medium' : 'text-muted-foreground'}>
                            {formatDate(driver.medical_card_expiry)}
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">{formatStatus(driver.status)}</Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="access">
          <Card>
            <CardHeader className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="text-lg">Access view</CardTitle>
                <p className="text-sm text-muted-foreground">Portal access and contact details.</p>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {drivers.length === 0 ? (
                <div className="p-10 text-center text-sm text-muted-foreground">No drivers yet.</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Driver</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Portal</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {drivers.map((driver) => (
                      <TableRow key={driver.id}>
                        <TableCell className="font-medium">{formatFullName(driver.first_name, driver.last_name)}</TableCell>
                        <TableCell className="text-muted-foreground">{driver.email || 'No email'}</TableCell>
                        <TableCell className="text-muted-foreground">{driver.phone}</TableCell>
                        <TableCell>
                          <Badge
                            variant="secondary"
                            className={driver.has_login ? 'bg-primary/10 text-primary border-primary/20' : 'bg-muted text-muted-foreground'}
                          >
                            {driver.has_login ? 'Enabled' : 'Disabled'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{formatStatus(driver.status)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="compensation">
          <Card>
            <CardHeader className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="text-lg">Compensation view</CardTitle>
                <p className="text-sm text-muted-foreground">Pay modes and configured rates.</p>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {drivers.length === 0 ? (
                <div className="p-10 text-center text-sm text-muted-foreground">No drivers yet.</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Driver</TableHead>
                      <TableHead>Pay Mode</TableHead>
                      <TableHead>Rate</TableHead>
                      <TableHead>Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {drivers.map((driver) => (
                      <TableRow key={driver.id}>
                        <TableCell className="font-medium">{formatFullName(driver.first_name, driver.last_name)}</TableCell>
                        <TableCell className="text-muted-foreground">{formatPayMode(driver.pay_mode)}</TableCell>
                        <TableCell className="text-muted-foreground">{formatCompensation(driver)}</TableCell>
                        <TableCell className="text-muted-foreground">{driver.pay_notes || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
          <div className="grid gap-4 mt-4 md:grid-cols-5">
            <Card>
              <CardContent className="py-3">
                <p className="text-[11px] uppercase tracking-[0.1em] text-muted-foreground">Per mile</p>
                <p className="text-2xl font-semibold text-foreground">{payModeBreakdown.per_mile || 0}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-3">
                <p className="text-[11px] uppercase tracking-[0.1em] text-muted-foreground">Per cu ft</p>
                <p className="text-2xl font-semibold text-foreground">{payModeBreakdown.per_cuft || 0}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-3">
                <p className="text-[11px] uppercase tracking-[0.1em] text-muted-foreground">Per mile + cu ft</p>
                <p className="text-2xl font-semibold text-foreground">{payModeBreakdown.per_mile_and_cuft || 0}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-3">
                <p className="text-[11px] uppercase tracking-[0.1em] text-muted-foreground">% of revenue</p>
                <p className="text-2xl font-semibold text-foreground">{payModeBreakdown.percent_of_revenue || 0}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-3">
                <p className="text-[11px] uppercase tracking-[0.1em] text-muted-foreground">Flat daily rate</p>
                <p className="text-2xl font-semibold text-foreground">{payModeBreakdown.flat_daily_rate || 0}</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
