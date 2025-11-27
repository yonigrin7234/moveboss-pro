import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getCurrentUser } from '@/lib/supabase-server';
import {
  getComplianceDocuments,
  getExpiringDocuments,
  getExpiredDocuments,
  getDocumentCounts,
  DOCUMENT_TYPES,
  DOCUMENT_STATUS_CONFIG,
  type ComplianceDocument,
} from '@/data/compliance-documents';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Plus,
  FileText,
  AlertTriangle,
  CheckCircle,
  Clock,
  XCircle,
  Building2,
  Calendar,
  Download,
  ExternalLink,
} from 'lucide-react';

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

function DocumentCard({ document }: { document: ComplianceDocument }) {
  const status = DOCUMENT_STATUS_CONFIG[document.status] || DOCUMENT_STATUS_CONFIG.pending_review;
  const daysUntilExpiration = getDaysUntilExpiration(document.expiration_date);
  const isExpired = daysUntilExpiration !== null && daysUntilExpiration < 0;
  const isExpiringSoon = daysUntilExpiration !== null && daysUntilExpiration >= 0 && daysUntilExpiration <= 30;

  return (
    <Link href={`/dashboard/compliance/${document.id}`}>
      <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full">
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                <FileText className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="font-semibold">{document.document_name}</p>
                <p className="text-sm text-muted-foreground">
                  {getDocumentTypeLabel(document.document_type)}
                </p>
              </div>
            </div>
            <Badge className={status.color}>{status.label}</Badge>
          </div>

          <div className="space-y-2 text-sm">
            {document.company && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Building2 className="h-3.5 w-3.5" />
                <span>{document.company.name}</span>
              </div>
            )}

            {document.expiration_date && (
              <div
                className={`flex items-center gap-2 ${
                  isExpired
                    ? 'text-red-600 dark:text-red-400'
                    : isExpiringSoon
                      ? 'text-yellow-600 dark:text-yellow-400'
                      : 'text-muted-foreground'
                }`}
              >
                <Calendar className="h-3.5 w-3.5" />
                <span>
                  {isExpired
                    ? `Expired ${Math.abs(daysUntilExpiration!)} days ago`
                    : isExpiringSoon
                      ? `Expires in ${daysUntilExpiration} days`
                      : `Expires ${new Date(document.expiration_date).toLocaleDateString()}`}
                </span>
              </div>
            )}

            {document.policy_number && (
              <p className="text-muted-foreground">Policy: {document.policy_number}</p>
            )}
          </div>

          {(isExpired || isExpiringSoon) && document.status === 'approved' && (
            <div
              className={`mt-3 flex items-center gap-1 text-xs ${
                isExpired ? 'text-red-600 dark:text-red-400' : 'text-yellow-600 dark:text-yellow-400'
              }`}
            >
              <AlertTriangle className="h-3 w-3" />
              {isExpired ? 'Document has expired' : 'Expiring soon'}
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}

export default async function CompliancePage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const [allDocuments, expiringDocuments, expiredDocuments, counts] = await Promise.all([
    getComplianceDocuments(user.id),
    getExpiringDocuments(user.id),
    getExpiredDocuments(user.id),
    getDocumentCounts(user.id),
  ]);

  const pendingDocuments = allDocuments.filter((d) => d.status === 'pending_review');
  const approvedDocuments = allDocuments.filter((d) => d.status === 'approved');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Compliance Documents</h1>
          <p className="text-muted-foreground">Manage W-9s, insurance, and hauling agreements</p>
        </div>
        <Button asChild>
          <Link href="/dashboard/compliance/upload">
            <Plus className="h-4 w-4 mr-2" />
            Upload Document
          </Link>
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-blue-500/10 flex items-center justify-center">
                <FileText className="h-6 w-6 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{counts.total}</p>
                <p className="text-sm text-muted-foreground">Total Documents</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-yellow-500/10 flex items-center justify-center">
                <Clock className="h-6 w-6 text-yellow-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{counts.pending}</p>
                <p className="text-sm text-muted-foreground">Pending Review</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-orange-500/10 flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-orange-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{counts.expiring}</p>
                <p className="text-sm text-muted-foreground">Expiring Soon</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-red-500/10 flex items-center justify-center">
                <XCircle className="h-6 w-6 text-red-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{counts.expired}</p>
                <p className="text-sm text-muted-foreground">Expired</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Expiration Alerts */}
      {(expiringDocuments.length > 0 || expiredDocuments.length > 0) && (
        <Card className="border-orange-500/30 bg-orange-500/5">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-orange-500 mt-0.5" />
              <div>
                <p className="font-medium text-orange-600 dark:text-orange-400">
                  Attention Required
                </p>
                <p className="text-sm text-muted-foreground">
                  {expiredDocuments.length > 0 && (
                    <span className="text-red-600 dark:text-red-400">
                      {expiredDocuments.length} document{expiredDocuments.length !== 1 ? 's' : ''} expired.{' '}
                    </span>
                  )}
                  {expiringDocuments.length > 0 && (
                    <span>
                      {expiringDocuments.length} document{expiringDocuments.length !== 1 ? 's' : ''} expiring within 30 days.
                    </span>
                  )}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">All ({allDocuments.length})</TabsTrigger>
          <TabsTrigger value="pending">Pending ({pendingDocuments.length})</TabsTrigger>
          <TabsTrigger value="expiring">
            Expiring ({expiringDocuments.length + expiredDocuments.length})
          </TabsTrigger>
          <TabsTrigger value="approved">Approved ({approvedDocuments.length})</TabsTrigger>
        </TabsList>

        {/* All Tab */}
        <TabsContent value="all" className="space-y-4 mt-4">
          {allDocuments.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No documents yet</h3>
                <p className="text-muted-foreground mb-4">
                  Upload compliance documents for your companies and partners
                </p>
                <Button asChild>
                  <Link href="/dashboard/compliance/upload">
                    <Plus className="h-4 w-4 mr-2" />
                    Upload First Document
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {allDocuments.map((doc) => (
                <DocumentCard key={doc.id} document={doc} />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Pending Tab */}
        <TabsContent value="pending" className="space-y-4 mt-4">
          {pendingDocuments.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center text-muted-foreground">
                <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
                No documents pending review
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {pendingDocuments.map((doc) => (
                <DocumentCard key={doc.id} document={doc} />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Expiring Tab */}
        <TabsContent value="expiring" className="space-y-4 mt-4">
          {expiredDocuments.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-semibold text-red-600 dark:text-red-400 flex items-center gap-2">
                <XCircle className="h-4 w-4" />
                Expired
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {expiredDocuments.map((doc) => (
                  <DocumentCard key={doc.id} document={doc} />
                ))}
              </div>
            </div>
          )}

          {expiringDocuments.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-semibold text-yellow-600 dark:text-yellow-400 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Expiring Soon (within 30 days)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {expiringDocuments.map((doc) => (
                  <DocumentCard key={doc.id} document={doc} />
                ))}
              </div>
            </div>
          )}

          {expiringDocuments.length === 0 && expiredDocuments.length === 0 && (
            <Card>
              <CardContent className="p-6 text-center text-muted-foreground">
                <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
                No expiring or expired documents
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Approved Tab */}
        <TabsContent value="approved" className="space-y-4 mt-4">
          {approvedDocuments.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center text-muted-foreground">
                No approved documents
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {approvedDocuments.map((doc) => (
                <DocumentCard key={doc.id} document={doc} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
