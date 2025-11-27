import { redirect, notFound } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import Link from 'next/link';
import {
  ArrowLeft,
  Building2,
  FileText,
  Calendar,
  Download,
  ExternalLink,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Upload,
  Trash2,
  Shield,
} from 'lucide-react';

import { getCurrentUser } from '@/lib/supabase-server';
import {
  getDocumentById,
  updateDocumentStatus,
  deleteDocument,
  DOCUMENT_TYPES,
  DOCUMENT_STATUS_CONFIG,
} from '@/data/compliance-documents';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';

function getDocumentTypeLabel(type: string): string {
  return DOCUMENT_TYPES.find((t) => t.value === type)?.label || type;
}

function getDaysUntilExpiration(expirationDate: string | null): number | null {
  if (!expirationDate) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expDate = new Date(expirationDate);
  const diffTime = expDate.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

export default async function ComplianceDocumentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const { id } = await params;
  const document = await getDocumentById(id, user.id);

  if (!document) {
    notFound();
  }

  const status = DOCUMENT_STATUS_CONFIG[document.status] || DOCUMENT_STATUS_CONFIG.pending_review;
  const daysUntilExpiration = getDaysUntilExpiration(document.expiration_date);
  const isExpired = daysUntilExpiration !== null && daysUntilExpiration < 0;
  const isExpiringSoon = daysUntilExpiration !== null && daysUntilExpiration >= 0 && daysUntilExpiration <= 30;

  async function approveAction(formData: FormData) {
    'use server';
    const user = await getCurrentUser();
    if (!user) redirect('/login');
    const { id } = await params;
    const notes = formData.get('notes') as string;
    await updateDocumentStatus(id, user.id, 'approved', notes || undefined);
    revalidatePath(`/dashboard/compliance/${id}`);
  }

  async function rejectAction(formData: FormData) {
    'use server';
    const user = await getCurrentUser();
    if (!user) redirect('/login');
    const { id } = await params;
    const notes = formData.get('notes') as string;
    await updateDocumentStatus(id, user.id, 'rejected', notes || undefined);
    revalidatePath(`/dashboard/compliance/${id}`);
  }

  async function deleteAction() {
    'use server';
    const user = await getCurrentUser();
    if (!user) redirect('/login');
    const { id } = await params;
    await deleteDocument(id, user.id);
    revalidatePath('/dashboard/compliance');
    redirect('/dashboard/compliance');
  }

  return (
    <div className="container max-w-4xl py-6 space-y-6">
      {/* Back Button */}
      <Button variant="ghost" size="sm" asChild>
        <Link href="/dashboard/compliance">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Compliance
        </Link>
      </Button>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-lg bg-muted flex items-center justify-center">
            <FileText className="h-8 w-8 text-muted-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">{document.document_name}</h1>
            <p className="text-muted-foreground">{getDocumentTypeLabel(document.document_type)}</p>
          </div>
        </div>
        <Badge className={status.color} style={{ fontSize: '0.875rem', padding: '0.5rem 1rem' }}>
          {status.label}
        </Badge>
      </div>

      {/* Expiration Alert */}
      {(isExpired || isExpiringSoon) && document.status === 'approved' && (
        <Card className={isExpired ? 'border-red-500/30 bg-red-500/5' : 'border-orange-500/30 bg-orange-500/5'}>
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className={`h-5 w-5 mt-0.5 ${isExpired ? 'text-red-500' : 'text-orange-500'}`} />
              <div>
                <p className={`font-medium ${isExpired ? 'text-red-600 dark:text-red-400' : 'text-orange-600 dark:text-orange-400'}`}>
                  {isExpired ? 'Document Expired' : 'Document Expiring Soon'}
                </p>
                <p className="text-sm text-muted-foreground">
                  {isExpired
                    ? `This document expired ${Math.abs(daysUntilExpiration!)} days ago.`
                    : `This document expires in ${daysUntilExpiration} days.`}
                  {' '}Request an updated version from the company.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Document Info */}
        <Card>
          <CardHeader>
            <CardTitle>Document Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {document.company && (
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{document.company.name}</span>
              </div>
            )}

            {document.description && (
              <div>
                <p className="text-sm text-muted-foreground">Description</p>
                <p>{document.description}</p>
              </div>
            )}

            <Separator />

            <div className="grid grid-cols-2 gap-4 text-sm">
              {document.effective_date && (
                <div>
                  <p className="text-muted-foreground">Effective Date</p>
                  <p className="font-medium">{new Date(document.effective_date).toLocaleDateString()}</p>
                </div>
              )}
              {document.expiration_date && (
                <div>
                  <p className="text-muted-foreground">Expiration Date</p>
                  <p className={`font-medium ${isExpired ? 'text-red-600' : isExpiringSoon ? 'text-yellow-600' : ''}`}>
                    {new Date(document.expiration_date).toLocaleDateString()}
                  </p>
                </div>
              )}
            </div>

            {document.version > 1 && (
              <div className="text-sm">
                <p className="text-muted-foreground">Version</p>
                <p className="font-medium">Version {document.version}</p>
              </div>
            )}

            <div className="text-sm">
              <p className="text-muted-foreground">Uploaded</p>
              <p className="font-medium">{new Date(document.created_at).toLocaleDateString()}</p>
            </div>
          </CardContent>
        </Card>

        {/* Insurance Details (if applicable) */}
        {(document.insurance_company || document.policy_number || document.coverage_amount) && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Insurance Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {document.insurance_company && (
                <div>
                  <p className="text-sm text-muted-foreground">Insurance Company</p>
                  <p className="font-medium">{document.insurance_company}</p>
                </div>
              )}
              {document.policy_number && (
                <div>
                  <p className="text-sm text-muted-foreground">Policy Number</p>
                  <p className="font-medium">{document.policy_number}</p>
                </div>
              )}
              {document.coverage_amount && (
                <div>
                  <p className="text-sm text-muted-foreground">Coverage Amount</p>
                  <p className="font-medium">${document.coverage_amount.toLocaleString()}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* File Details */}
        <Card className={document.insurance_company ? 'md:col-span-2' : ''}>
          <CardHeader>
            <CardTitle>Document File</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-3">
                <FileText className="h-8 w-8 text-muted-foreground" />
                <div>
                  <p className="font-medium">{document.file_name || 'Document'}</p>
                  <p className="text-sm text-muted-foreground">
                    {document.file_type || 'Unknown type'}
                    {document.file_size && ` • ${(document.file_size / 1024).toFixed(1)} KB`}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" asChild>
                  <a href={document.file_url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    View
                  </a>
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <a href={document.file_url} download>
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </a>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Review Section */}
      {document.status === 'pending_review' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Review Document
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <form action={approveAction} className="space-y-3">
                <Label>Approve Document</Label>
                <Textarea name="notes" placeholder="Optional approval notes" rows={2} />
                <Button type="submit" className="w-full bg-green-600 hover:bg-green-700">
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Approve
                </Button>
              </form>

              <form action={rejectAction} className="space-y-3">
                <Label>Reject Document</Label>
                <Textarea name="notes" placeholder="Reason for rejection" rows={2} />
                <Button type="submit" variant="destructive" className="w-full">
                  <XCircle className="h-4 w-4 mr-2" />
                  Reject
                </Button>
              </form>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Review History */}
      {document.reviewed_at && (
        <Card>
          <CardHeader>
            <CardTitle>Review History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-start gap-3">
              {document.status === 'approved' ? (
                <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
              ) : (
                <XCircle className="h-5 w-5 text-red-500 mt-0.5" />
              )}
              <div>
                <p className="font-medium">
                  {document.status === 'approved' ? 'Approved' : 'Rejected'} on{' '}
                  {new Date(document.reviewed_at).toLocaleDateString()}
                </p>
                {document.review_notes && (
                  <p className="text-sm text-muted-foreground mt-1">{document.review_notes}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Actions</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-4">
          <Button variant="outline" asChild>
            <Link href={`/dashboard/compliance/upload?replace=${document.id}`}>
              <Upload className="h-4 w-4 mr-2" />
              Upload New Version
            </Link>
          </Button>
          <form action={deleteAction}>
            <Button type="submit" variant="destructive">
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Document
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
