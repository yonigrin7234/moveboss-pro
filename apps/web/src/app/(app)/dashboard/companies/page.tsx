import Link from 'next/link';
import { redirect } from 'next/navigation';

import {
  getCompaniesForUser,
  getCompaniesStatsForUser,
  type Company,
  type CompanyFilters,
  type CompanyType,
  type Status,
} from '@/data/companies';
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
import { CompanyListFilters } from './company-list-filters';
import { MetricsCard } from '@/components/dashboard/MetricsCard';

const COMPANY_TYPES: readonly CompanyType[] = ['customer', 'carrier', 'both'] as const;
const COMPANY_STATUSES: readonly Status[] = ['active', 'inactive', 'suspended'] as const;

function isInList<T extends string>(value: string | undefined, list: readonly T[]): value is T {
  return value !== undefined && (list as readonly string[]).includes(value);
}

function normalizeCompanyType(value?: string): CompanyFilters['type'] {
  return isInList(value, COMPANY_TYPES) ? value : 'all';
}

function normalizeCompanyStatus(value?: string): CompanyFilters['status'] {
  return isInList(value, COMPANY_STATUSES) ? value : 'all';
}

function formatCompanyType(type: Company['company_type']): string {
  switch (type) {
    case 'customer':
      return 'Customer';
    case 'carrier':
      return 'Carrier';
    case 'both':
      return 'Both';
    default:
      return type;
  }
}

function formatStatus(status: Company['status']): string {
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


interface CompaniesPageProps {
  searchParams: Promise<{
    search?: string;
    type?: string;
    role?: string;
    status?: string;
  }>;
}

export default async function CompaniesPage({ searchParams }: CompaniesPageProps) {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  const params = await searchParams;
  const filters: CompanyFilters = {
    search: params.search,
    type: normalizeCompanyType(params.type),
    role: (params.role === 'takes_loads_from' || params.role === 'gives_loads_to' || params.role === 'both') ? params.role : params.role ? 'all' : undefined,
    status: normalizeCompanyStatus(params.status),
  };

  let companies: Company[] = [];
  let stats = { totalCompanies: 0, activeCompanies: 0 };
  let error: string | null = null;

  try {
    [companies, stats] = await Promise.all([
      getCompaniesForUser(user.id, filters),
      getCompaniesStatsForUser(user.id),
    ]);
  } catch (err) {
    error = err instanceof Error ? err.message : 'Failed to load companies';
  }

  function formatDate(dateString: string | null): string {
    if (!dateString) return '—';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return '—';
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">
          Companies
        </h1>
        <Button asChild className="w-full md:w-auto">
          <Link href="/dashboard/companies/new">Add Company</Link>
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        <MetricsCard title="Total Companies" value={stats.totalCompanies} />
        <MetricsCard title="Active" value={stats.activeCompanies} />
      </div>

      <CompanyListFilters initialFilters={filters} />

      {error && (
        <Card className="border-destructive bg-destructive/10">
          <CardContent className="pt-6 text-sm text-destructive">
            {error}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          {companies.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center p-10 text-center">
                <p className="text-sm text-muted-foreground mb-4">
                  No companies yet. Add your first company to start assigning loads and trips.
                </p>
                <Button asChild>
                  <Link href="/dashboard/companies/new">Add Company</Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Primary Contact</TableHead>
                  <TableHead>Primary Phone</TableHead>
                  <TableHead>Billing City / State</TableHead>
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
                    <TableCell>{formatCompanyType(company.company_type)}</TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={
                          company.status === 'active'
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                            : company.status === 'suspended'
                              ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                              : 'bg-muted text-muted-foreground'
                        }
                      >
                        {formatStatus(company.status)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {company.primary_contact_name || '—'}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {company.primary_contact_phone || '—'}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {[company.billing_city, company.billing_state].filter(Boolean).join(', ') || '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

