import { createClient, getCurrentUser } from '@/lib/supabase-server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  FileText,
  Upload,
  PackagePlus,
  Truck,
  Clock,
  AlertCircle,
} from 'lucide-react';
import { JobCard, type PostedJob } from './JobCard';

export default async function PostedJobsPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const supabase = await createClient();

  // Get user's workspace company
  const { data: workspaceCompany, error: companyError } = await supabase
    .from('companies')
    .select('id')
    .eq('owner_id', user.id)
    .eq('is_workspace_company', true)
    .maybeSingle();

  if (companyError) {
    console.error('Error fetching workspace company:', companyError);
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold tracking-tight">My Posted Jobs</h1>
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            <AlertCircle className="mx-auto h-12 w-12 mb-4 text-destructive opacity-50" />
            <p>Error loading company data. Please try again.</p>
            <p className="text-xs mt-2 font-mono">{companyError.message}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

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
      id, job_number, load_number, load_type, posting_type, posting_status, posted_at,
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

  // Fetch pending request counts for all posted jobs
  const jobIds = jobs.map((j) => j.id);
  const requestCountMap: Record<string, number> = {};

  if (jobIds.length > 0) {
    const { data: requestCounts } = await supabase
      .from('load_requests')
      .select('load_id')
      .in('load_id', jobIds)
      .eq('status', 'pending');

    if (requestCounts) {
      for (const req of requestCounts) {
        requestCountMap[req.load_id] = (requestCountMap[req.load_id] || 0) + 1;
      }
    }
  }

  const pickups = jobs.filter((j) => j.posting_type === 'pickup');
  const loads = jobs.filter((j) => j.posting_type === 'load');

  // Status-based filtering
  const activeJobs = jobs.filter((j) => ['posted', 'assigned', 'in_progress'].includes(j.posting_status));
  const completedJobs = jobs.filter((j) => j.posting_status === 'completed');
  const cancelledJobs = jobs.filter((j) => j.posting_status === 'cancelled');
  const draftJobs = jobs.filter((j) => j.posting_status === 'draft' || !j.posting_status);

  const totalPendingRequests = Object.values(requestCountMap).reduce((sum, count) => sum + count, 0);

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
      <div className="grid gap-4 md:grid-cols-5">
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
        <Card className={totalPendingRequests > 0 ? 'border-orange-500/30' : ''}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Requests</CardTitle>
            <Truck className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${totalPendingRequests > 0 ? 'text-orange-500' : ''}`}>
              {totalPendingRequests}
            </div>
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

      {/* Jobs List - Status-based tabs */}
      <Tabs defaultValue="active" className="space-y-4">
        <TabsList>
          <TabsTrigger value="active">Active ({activeJobs.length})</TabsTrigger>
          <TabsTrigger value="completed">Completed ({completedJobs.length})</TabsTrigger>
          <TabsTrigger value="cancelled">Cancelled ({cancelledJobs.length})</TabsTrigger>
          <TabsTrigger value="drafts">Drafts ({draftJobs.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-4">
          {activeJobs.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center text-muted-foreground">
                <FileText className="mx-auto h-12 w-12 mb-4 opacity-50" />
                <p>No active posted jobs.</p>
                <p className="text-sm mt-2">Post a pickup or load to get started.</p>
              </CardContent>
            </Card>
          ) : (
            activeJobs.map((job) => <JobCard key={job.id} job={job} requestCount={requestCountMap[job.id] || 0} />)
          )}
        </TabsContent>

        <TabsContent value="completed" className="space-y-4">
          {completedJobs.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center text-muted-foreground">
                <FileText className="mx-auto h-12 w-12 mb-4 opacity-50" />
                <p>No completed jobs yet.</p>
                <p className="text-sm mt-2">Jobs will appear here once they&apos;re marked as completed.</p>
              </CardContent>
            </Card>
          ) : (
            completedJobs.map((job) => <JobCard key={job.id} job={job} requestCount={requestCountMap[job.id] || 0} />)
          )}
        </TabsContent>

        <TabsContent value="cancelled" className="space-y-4">
          {cancelledJobs.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center text-muted-foreground">
                <FileText className="mx-auto h-12 w-12 mb-4 opacity-50" />
                <p>No cancelled jobs.</p>
              </CardContent>
            </Card>
          ) : (
            cancelledJobs.map((job) => <JobCard key={job.id} job={job} requestCount={requestCountMap[job.id] || 0} />)
          )}
        </TabsContent>

        <TabsContent value="drafts" className="space-y-4">
          {draftJobs.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center text-muted-foreground">
                <FileText className="mx-auto h-12 w-12 mb-4 opacity-50" />
                <p>No draft or unpublished jobs.</p>
              </CardContent>
            </Card>
          ) : (
            draftJobs.map((job) => <JobCard key={job.id} job={job} requestCount={requestCountMap[job.id] || 0} />)
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
