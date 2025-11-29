import { createClient, getCurrentUser } from '@/lib/supabase-server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  FileText,
  Upload,
  PackagePlus,
  MapPin,
  Calendar,
  DollarSign,
  Package,
  Truck,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
} from 'lucide-react';

interface PostedJob {
  id: string;
  job_number: string;
  load_type: string;
  posting_type: string;
  posting_status: string;
  posted_at: string;
  pickup_date_start: string | null;
  pickup_date_end: string | null;
  pickup_date: string | null;
  pickup_city: string | null;
  pickup_state: string | null;
  dropoff_city: string | null;
  dropoff_state: string | null;
  delivery_city: string | null;
  delivery_state: string | null;
  current_storage_location: string | null;
  loading_city: string | null;
  loading_state: string | null;
  cubic_feet: number | null;
  rate_per_cuft: number | null;
  balance_due: number | null;
  linehaul_amount: number | null;
  assigned_carrier: { id: string; name: string } | null;
  truck_requirement: 'any' | 'semi_only' | 'box_truck_only' | null;
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'posted':
      return (
        <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/20">
          <Clock className="mr-1 h-3 w-3" />
          Posted
        </Badge>
      );
    case 'assigned':
      return (
        <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">
          <CheckCircle2 className="mr-1 h-3 w-3" />
          Assigned
        </Badge>
      );
    case 'in_progress':
      return (
        <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">
          <Truck className="mr-1 h-3 w-3" />
          In Progress
        </Badge>
      );
    case 'completed':
      return (
        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
          <CheckCircle2 className="mr-1 h-3 w-3" />
          Completed
        </Badge>
      );
    case 'cancelled':
      return (
        <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/20">
          <XCircle className="mr-1 h-3 w-3" />
          Cancelled
        </Badge>
      );
    default:
      return (
        <Badge variant="outline" className="bg-gray-500/10 text-gray-600 border-gray-500/20">
          <AlertCircle className="mr-1 h-3 w-3" />
          {status}
        </Badge>
      );
  }
}

function getTypeBadge(postingType: string, loadType: string) {
  if (postingType === 'pickup') {
    return (
      <Badge variant="secondary" className="bg-purple-500/10 text-purple-600">
        <Upload className="mr-1 h-3 w-3" />
        Pickup
      </Badge>
    );
  }
  if (loadType === 'rfd') {
    return (
      <Badge variant="secondary" className="bg-orange-500/10 text-orange-600">
        <Package className="mr-1 h-3 w-3" />
        RFD
      </Badge>
    );
  }
  return (
    <Badge variant="secondary" className="bg-cyan-500/10 text-cyan-600">
      <Truck className="mr-1 h-3 w-3" />
      Live Load
    </Badge>
  );
}

function formatCurrency(amount: number | null) {
  if (amount === null || amount === undefined) return '-';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(date: string | null) {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function getRoute(job: PostedJob) {
  // For RFD loads, use storage location as origin
  if (job.load_type === 'rfd') {
    const origin = job.loading_city && job.loading_state
      ? `${job.loading_city}, ${job.loading_state}`
      : job.current_storage_location || 'Storage';
    const dest = job.dropoff_city && job.dropoff_state
      ? `${job.dropoff_city}, ${job.dropoff_state}`
      : job.delivery_city && job.delivery_state
        ? `${job.delivery_city}, ${job.delivery_state}`
        : '-';
    return `${origin} → ${dest}`;
  }

  // For pickups and live loads
  const origin = job.pickup_city && job.pickup_state
    ? `${job.pickup_city}, ${job.pickup_state}`
    : '-';
  const dest = job.dropoff_city && job.dropoff_state
    ? `${job.dropoff_city}, ${job.dropoff_state}`
    : job.delivery_city && job.delivery_state
      ? `${job.delivery_city}, ${job.delivery_state}`
      : '-';
  return `${origin} → ${dest}`;
}

function JobCard({ job }: { job: PostedJob }) {
  const price = job.posting_type === 'pickup' ? job.balance_due : job.linehaul_amount;
  const priceLabel = job.posting_type === 'pickup' ? 'Balance Due' : 'Linehaul';
  const dateDisplay = job.pickup_date_start && job.pickup_date_end
    ? `${formatDate(job.pickup_date_start)} - ${formatDate(job.pickup_date_end)}`
    : formatDate(job.pickup_date);

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono font-semibold">{job.job_number}</span>
              {getTypeBadge(job.posting_type, job.load_type)}
              {getStatusBadge(job.posting_status)}
              {job.truck_requirement === 'semi_only' && (
                <Badge className="bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-0">
                  🚛 Semi Only
                </Badge>
              )}
              {job.truck_requirement === 'box_truck_only' && (
                <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-0">
                  📦 Box Truck Only
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />
                {getRoute(job)}
              </span>
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                {dateDisplay}
              </span>
              <span className="flex items-center gap-1">
                <Package className="h-3.5 w-3.5" />
                {job.cubic_feet ?? '-'} CUFT
              </span>
              <span className="flex items-center gap-1">
                <DollarSign className="h-3.5 w-3.5" />
                {formatCurrency(price)} {priceLabel}
              </span>
            </div>
            {job.assigned_carrier && (
              <div className="text-sm">
                <span className="text-muted-foreground">Assigned to: </span>
                <span className="font-medium">{job.assigned_carrier.name}</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href={`/dashboard/loads/${job.id}`}>View</Link>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default async function PostedJobsPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const supabase = await createClient();

  // Get user's workspace company
  const { data: workspaceCompany } = await supabase
    .from('companies')
    .select('id')
    .eq('owner_id', user.id)
    .eq('is_workspace_company', true)
    .maybeSingle();

  if (!workspaceCompany) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold tracking-tight">My Posted Jobs</h1>
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            No company found. Please complete your company profile first.
          </CardContent>
        </Card>
      </div>
    );
  }

  // Fetch posted jobs
  const { data: postedJobs, error } = await supabase
    .from('loads')
    .select(`
      id, job_number, load_type, posting_type, posting_status, posted_at,
      pickup_date_start, pickup_date_end, pickup_date,
      pickup_city, pickup_state,
      dropoff_city, dropoff_state, delivery_city, delivery_state,
      cubic_feet, rate_per_cuft, balance_due, linehaul_amount,
      current_storage_location, loading_city, loading_state,
      truck_requirement,
      assigned_carrier:assigned_carrier_id(id, name)
    `)
    .eq('posted_by_company_id', workspaceCompany.id)
    .not('posting_type', 'is', null)
    .order('posted_at', { ascending: false });

  if (error) {
    console.error('Error fetching posted jobs:', error);
  }

  const jobs = (postedJobs || []) as unknown as PostedJob[];
  const pickups = jobs.filter((j) => j.posting_type === 'pickup');
  const loads = jobs.filter((j) => j.posting_type === 'load');
  const activeJobs = jobs.filter((j) => ['posted', 'assigned', 'in_progress'].includes(j.posting_status));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">My Posted Jobs</h1>
          <p className="text-muted-foreground">
            Manage your posted pickups and loads
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link href="/dashboard/post-pickup">
              <Upload className="mr-2 h-4 w-4" />
              Post Pickup
            </Link>
          </Button>
          <Button asChild>
            <Link href="/dashboard/post-load">
              <PackagePlus className="mr-2 h-4 w-4" />
              Post Load
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Posted</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{jobs.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeJobs.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pickups</CardTitle>
            <Upload className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pickups.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Loads</CardTitle>
            <PackagePlus className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loads.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Jobs List */}
      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">All ({jobs.length})</TabsTrigger>
          <TabsTrigger value="pickups">Pickups ({pickups.length})</TabsTrigger>
          <TabsTrigger value="loads">Loads ({loads.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          {jobs.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center text-muted-foreground">
                <FileText className="mx-auto h-12 w-12 mb-4 opacity-50" />
                <p>No posted jobs yet.</p>
                <p className="text-sm mt-2">Post a pickup or load to get started.</p>
              </CardContent>
            </Card>
          ) : (
            jobs.map((job) => <JobCard key={job.id} job={job} />)
          )}
        </TabsContent>

        <TabsContent value="pickups" className="space-y-4">
          {pickups.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center text-muted-foreground">
                <Upload className="mx-auto h-12 w-12 mb-4 opacity-50" />
                <p>No pickups posted yet.</p>
                <Button variant="outline" className="mt-4" asChild>
                  <Link href="/dashboard/post-pickup">Post a Pickup</Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            pickups.map((job) => <JobCard key={job.id} job={job} />)
          )}
        </TabsContent>

        <TabsContent value="loads" className="space-y-4">
          {loads.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center text-muted-foreground">
                <PackagePlus className="mx-auto h-12 w-12 mb-4 opacity-50" />
                <p>No loads posted yet.</p>
                <Button variant="outline" className="mt-4" asChild>
                  <Link href="/dashboard/post-load">Post a Load</Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            loads.map((job) => <JobCard key={job.id} job={job} />)
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
