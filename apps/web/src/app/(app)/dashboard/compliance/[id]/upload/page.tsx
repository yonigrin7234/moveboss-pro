import { redirect, notFound } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import Link from 'next/link';
import { getCurrentUser } from '@/lib/supabase-server';
import { createClient } from '@/lib/supabase-server';
import { getComplianceRequestById, uploadComplianceDocument } from '@/data/compliance';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, FileText, Upload, Building2, AlertTriangle } from 'lucide-react';

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

  async function uploadAction(formData: FormData) {
    'use server';

    const currentUser = await getCurrentUser();
    if (!currentUser) redirect('/login');

    const supabase = await createClient();

    const file = formData.get('file') as File;

    if (!file || file.size === 0) {
      return;
    }

    // Upload file to Supabase Storage
    const fileName = `${id}/${Date.now()}-${file.name}`;
    const { error: uploadError } = await supabase.storage
      .from('compliance-documents')
      .upload(fileName, file);

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return;
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('compliance-documents')
      .getPublicUrl(fileName);

    // Get request to find carrier_id
    const req = await getComplianceRequestById(id);

    if (!req) return;

    // Save document record
    await uploadComplianceDocument(
      id,
      req.carrier_id,
      currentUser.id,
      urlData.publicUrl,
      file.name,
      file.size,
      file.type
    );

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
          <form action={uploadAction} className="space-y-4">
            <div>
              <Label htmlFor="file">Select File *</Label>
              <Input
                id="file"
                name="file"
                type="file"
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                required
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Accepted formats: PDF, DOC, DOCX, JPG, PNG. Max 10MB.
              </p>
            </div>

            {request.status === 'rejected' && request.rejection_reason && (
              <div className="p-3 bg-red-500/10 rounded-lg flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-red-600">Previous upload rejected</p>
                  <p className="text-sm text-red-600">{request.rejection_reason}</p>
                </div>
              </div>
            )}

            {request.due_date && (
              <p className="text-sm text-muted-foreground">
                Due by: {new Date(request.due_date).toLocaleDateString()}
              </p>
            )}

            <Button type="submit" className="w-full">
              <Upload className="h-4 w-4 mr-2" />
              Upload Document
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
