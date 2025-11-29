import { cookies } from 'next/headers';
import { redirect, notFound } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import Link from 'next/link';
import { createClient } from '@/lib/supabase-server';
import {
  getComplianceRequestsForPartnership,
  approveComplianceDocument,
  rejectComplianceDocument,
} from '@/data/compliance';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  ArrowLeft,
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  ExternalLink,
  Building2,
} from 'lucide-react';

interface PageProps {
  params: Promise<{ id: string }>;
}

async function getCompanySession() {
  const cookieStore = await cookies();
  const session = cookieStore.get('company_session');
  if (!session) return null;
  try {
    return JSON.parse(session.value);
  } catch {
    return null;
  }
}

export default async function ComplianceReviewPage({ params }: PageProps) {
  const { id } = await params;
  const session = await getCompanySession();

  if (!session) {
    redirect('/company-login');
  }

  const supabase = await createClient();

  // Get partnership
  const { data: partnership } = await supabase
    .from('company_partnerships')
    .select(
      `
      *,
      carrier:companies!company_partnerships_company_b_id_fkey(id, name)
    `
    )
    .eq('id', id)
    .eq('company_a_id', session.company_id)
    .single();

  if (!partnership) {
    notFound();
  }

  const carrier = Array.isArray(partnership.carrier)
    ? partnership.carrier[0]
    : partnership.carrier;

  // Get compliance requests
  const requests = await getComplianceRequestsForPartnership(id);

  async function approveAction(formData: FormData) {
    'use server';
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('company_session');
    if (!sessionCookie) return;
    const sessionData = JSON.parse(sessionCookie.value);

    const requestId = formData.get('request_id') as string;
    await approveComplianceDocument(requestId, sessionData.owner_id);
    revalidatePath(`/company/carriers/${id}/compliance`);
  }

  async function rejectAction(formData: FormData) {
    'use server';
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('company_session');
    if (!sessionCookie) return;
    const sessionData = JSON.parse(sessionCookie.value);

    const requestId = formData.get('request_id') as string;
    const reason = formData.get('reason') as string;
    await rejectComplianceDocument(requestId, sessionData.owner_id, reason || 'Document rejected');
    revalidatePath(`/company/carriers/${id}/compliance`);
  }

  const statusConfig: Record<string, { label: string; color: string; icon: typeof Clock }> = {
    pending: { label: 'Pending', color: 'bg-yellow-500/20 text-yellow-400', icon: Clock },
    uploaded: { label: 'Needs Review', color: 'bg-blue-500/20 text-blue-400', icon: FileText },
    approved: { label: 'Approved', color: 'bg-green-500/20 text-green-400', icon: CheckCircle },
    rejected: { label: 'Rejected', color: 'bg-red-500/20 text-red-400', icon: XCircle },
  };

  const allApproved = requests.every((r) => r.status === 'approved');
  const pendingReview = requests.filter((r) => r.status === 'uploaded').length;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card sticky top-0 z-10">
        <div className="container flex items-center gap-4 h-14">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/company/carriers">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="font-semibold">Compliance Documents</h1>
            <p className="text-xs text-muted-foreground">{carrier?.name}</p>
          </div>
        </div>
      </header>

      <main className="container py-6 max-w-2xl space-y-6">
        {/* Status Banner */}
        {allApproved ? (
          <Card className="border-green-500/30 bg-green-500/5">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <div>
                  <p className="font-medium text-green-600">All documents approved</p>
                  <p className="text-sm text-muted-foreground">
                    Compliance is complete for this partnership
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : pendingReview > 0 ? (
          <Card className="border-blue-500/30 bg-blue-500/5">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-blue-500" />
                <div>
                  <p className="font-medium text-blue-600">
                    {pendingReview} document{pendingReview !== 1 ? 's' : ''} need review
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Review and approve uploaded documents
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-yellow-500/30 bg-yellow-500/5">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-yellow-500" />
                <div>
                  <p className="font-medium text-yellow-600">Waiting for carrier</p>
                  <p className="text-sm text-muted-foreground">
                    Carrier needs to upload required documents
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Documents List */}
        <div className="space-y-4">
          {requests.map((request) => {
            const status = statusConfig[request.status] || statusConfig.pending;
            const StatusIcon = status.icon;

            return (
              <Card key={request.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      {request.document_type?.name}
                    </CardTitle>
                    <Badge className={status.color}>
                      <StatusIcon className="h-3 w-3 mr-1" />
                      {status.label}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  {request.status === 'pending' && (
                    <p className="text-sm text-muted-foreground">Waiting for carrier to upload</p>
                  )}

                  {request.status === 'uploaded' && request.document && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          <span className="text-sm">{request.document.file_name}</span>
                        </div>
                        <Button variant="outline" size="sm" asChild>
                          <a
                            href={request.document.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <ExternalLink className="h-4 w-4 mr-1" />
                            View
                          </a>
                        </Button>
                      </div>

                      <div className="flex gap-2">
                        <form action={approveAction} className="flex-1">
                          <input type="hidden" name="request_id" value={request.id} />
                          <Button type="submit" className="w-full" variant="default">
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Approve
                          </Button>
                        </form>
                        <form action={rejectAction} className="flex-1">
                          <input type="hidden" name="request_id" value={request.id} />
                          <div className="flex gap-2">
                            <Input name="reason" placeholder="Rejection reason" className="flex-1" />
                            <Button type="submit" variant="outline" className="text-red-600">
                              <XCircle className="h-4 w-4" />
                            </Button>
                          </div>
                        </form>
                      </div>
                    </div>
                  )}

                  {request.status === 'approved' && (
                    <div className="flex items-center gap-2 text-green-600">
                      <CheckCircle className="h-4 w-4" />
                      <span className="text-sm">
                        Approved{' '}
                        {request.reviewed_at && new Date(request.reviewed_at).toLocaleDateString()}
                      </span>
                    </div>
                  )}

                  {request.status === 'rejected' && (
                    <div className="space-y-2">
                      <p className="text-sm text-red-600">Rejected: {request.rejection_reason}</p>
                      <p className="text-xs text-muted-foreground">
                        Waiting for carrier to upload new document
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {requests.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center">
              <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-4" />
              <h3 className="font-semibold mb-2">No compliance requests</h3>
              <p className="text-muted-foreground">
                This partner does not have any pending compliance requirements
              </p>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
