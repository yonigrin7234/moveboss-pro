import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

import { getCurrentUser } from '@/lib/supabase-server';
import { getCompaniesForDocuments, DOCUMENT_TYPES } from '@/data/compliance-documents';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { UploadDocumentForm } from './upload-form';

export default async function UploadDocumentPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const companies = await getCompaniesForDocuments(user.id);

  return (
    <div className="container max-w-2xl py-6">
      <div className="mb-6">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/dashboard/compliance">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Compliance
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Upload Compliance Document</CardTitle>
          <CardDescription>
            Upload W-9 forms, insurance certificates, hauling agreements, and other compliance documents
          </CardDescription>
        </CardHeader>
        <CardContent>
          <UploadDocumentForm
            companies={companies}
            documentTypes={DOCUMENT_TYPES}
            userId={user.id}
          />
        </CardContent>
      </Card>
    </div>
  );
}
