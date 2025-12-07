import { redirect, notFound } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import Link from 'next/link';
import { getCurrentUser } from '@/lib/supabase-server';
import { createClient } from '@/lib/supabase-server';
import { getComplianceRequestById, uploadComplianceDocument } from '@/data/compliance';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, FileText, Building2 } from 'lucide-react';
import { UploadForm } from './upload-form';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function UploadCompliancePage({ params }: PageProps) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  // Get request details
  const request = await getComplianceRequestById(id);

  if (!request) {
    notFound();
  }

  // Verify ownership - user must own the carrier company
  if (request.carrier?.owner_id !== user.id) {
    redirect('/dashboard/compliance');
  }

  async function uploadAction(formData: FormData): Promise<{ error?: string } | void> {
    'use server';

    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return { error: 'Not authenticated' };
    }

    const supabase = await createClient();

    const file = formData.get('file') as File;

    if (!file || file.size === 0) {
      return { error: 'Please select a file to upload' };
    }

    if (file.size > 10 * 1024 * 1024) {
      return { error: 'File size must be less than 10MB' };
    }

    // Upload file to Supabase Storage
    const fileName = `${id}/${Date.now()}-${file.name}`;
    const { error: uploadError } = await supabase.storage
      .from('compliance-documents')
      .upload(fileName, file);

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return { error: `Upload failed: ${uploadError.message}` };
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('compliance-documents')
      .getPublicUrl(fileName);

    // Get request to find carrier_id
    const req = await getComplianceRequestById(id);

    if (!req) {
      return { error: 'Compliance request not found' };
    }

    // Save document record
    const result = await uploadComplianceDocument(
      id,
      req.carrier_id,
      currentUser.id,
      urlData.publicUrl,
      file.name,
      file.size,
      file.type
    );

    if (!result.success) {
      return { error: result.error || 'Failed to save document record' };
    }

    revalidatePath('/dashboard/compliance');
    redirect('/dashboard/compliance');
  }

  return (
    <div className="container py-6 max-w-xl space-y-6">
      {/* Back */}
      <Button variant="ghost" size="sm" asChild>
        <Link href="/dashboard/compliance">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Compliance
        </Link>
      </Button>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Upload Document</h1>
        <p className="text-muted-foreground flex items-center gap-2 mt-1">
          <Building2 className="h-4 w-4" />
          For {request.requesting_company?.name}
        </p>
      </div>

      {/* Document Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {request.document_type?.name}
          </CardTitle>
          <CardDescription>{request.document_type?.description}</CardDescription>
        </CardHeader>
        <CardContent>
          <UploadForm
            requestId={id}
            carrierId={request.carrier_id}
            status={request.status}
            rejectionReason={request.rejection_reason}
            dueDate={request.due_date}
            uploadAction={uploadAction}
          />
        </CardContent>
      </Card>
    </div>
  );
}
