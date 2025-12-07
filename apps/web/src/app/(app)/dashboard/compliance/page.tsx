import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getCurrentUser } from '@/lib/supabase-server';
import {
  getComplianceAlerts,
  getAllComplianceItems,
  getComplianceDocuments,
  type ComplianceItem,
  type ComplianceDocument,
  DOCUMENT_STATUS_CONFIG,
  DOCUMENT_TYPES,
} from '@/data/compliance-documents';
import { getComplianceRequestsForUser } from '@/data/compliance';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
  User,
  Truck,
  Container,
  ChevronRight,
  Upload,
} from 'lucide-react';

const CATEGORY_CONFIG = {
  driver: { label: 'Drivers', icon: User, color: 'text-blue-500', bgColor: 'bg-blue-500/10' },
  truck: { label: 'Trucks', icon: Truck, color: 'text-green-500', bgColor: 'bg-green-500/10' },
  trailer: { label: 'Trailers', icon: Container, color: 'text-purple-500', bgColor: 'bg-purple-500/10' },
  document: { label: 'Documents', icon: FileText, color: 'text-orange-500', bgColor: 'bg-orange-500/10' },
};

function ComplianceItemCard({ item }: { item: ComplianceItem }) {
  const categoryConfig = CATEGORY_CONFIG[item.category];
  const CategoryIcon = categoryConfig.icon;

  return (
    <Link href={item.link}>
      <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <div className={`h-10 w-10 rounded-lg ${categoryConfig.bgColor} flex items-center justify-center`}>
                <CategoryIcon className={`h-5 w-5 ${categoryConfig.color}`} />
              </div>
              <div>
                <p className="font-medium">{item.name}</p>
                <p className="text-sm text-muted-foreground">{item.type}</p>
                <div className="flex items-center gap-2 mt-1">
                  <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                  <span
                    className={`text-sm ${
                      item.status === 'expired'
                        ? 'text-red-600 dark:text-red-400 font-medium'
                        : item.status === 'expiring_soon'
                          ? 'text-yellow-600 dark:text-yellow-400 font-medium'
                          : 'text-muted-foreground'
                    }`}
                  >
                    {item.status === 'expired'
                      ? `Expired ${Math.abs(item.days_until_expiration)} days ago`
                      : item.status === 'expiring_soon'
                        ? `Expires in ${item.days_until_expiration} days`
                        : new Date(item.expiration_date).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
            <Badge
              className={
                item.status === 'expired'
                  ? 'bg-red-500/20 text-red-600 dark:text-red-400'
                  : item.status === 'expiring_soon'
                    ? 'bg-yellow-500/20 text-yellow-600 dark:text-yellow-400'
                    : 'bg-green-500/20 text-green-600 dark:text-green-400'
              }
            >
              {item.status === 'expired' ? 'Expired' : item.status === 'expiring_soon' ? 'Expiring' : 'Valid'}
            </Badge>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function DocumentCard({ document }: { document: ComplianceDocument }) {
  const status = DOCUMENT_STATUS_CONFIG[document.status] || DOCUMENT_STATUS_CONFIG.pending_review;

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
                  {DOCUMENT_TYPES.find((t) => t.value === document.document_type)?.label || document.document_type}
                </p>
              </div>
            </div>
            <Badge className={status.color}>{status.label}</Badge>
          </div>

          {document.company && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Building2 className="h-3.5 w-3.5" />
              <span>{document.company.name}</span>
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

  // Get partner compliance requests for ALL companies owned by this user
  // (not just workspace company, as compliance requests may be linked to other companies)
  const [alerts, allItems, documents, partnerRequests] = await Promise.all([
    getComplianceAlerts(user.id),
    getAllComplianceItems(user.id),
    getComplianceDocuments(user.id),
    getComplianceRequestsForUser(user.id),
  ]);

  const pendingDocuments = documents.filter((d) => d.status === 'pending_review');
  const pendingPartnerRequests = partnerRequests.filter((r) => r.status === 'pending' || r.status === 'rejected');

  // Filter items by category
  const driverItems = allItems.filter((i) => i.category === 'driver');
  const truckItems = allItems.filter((i) => i.category === 'truck');
  const trailerItems = allItems.filter((i) => i.category === 'trailer');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Compliance Center</h1>
          <p className="text-muted-foreground">Track expirations for drivers, fleet, and documents</p>
        </div>
        <Button asChild>
          <Link href="/dashboard/compliance/upload">
            <Plus className="h-4 w-4 mr-2" />
            Upload Document
          </Link>
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-red-500/10 flex items-center justify-center">
                <XCircle className="h-6 w-6 text-red-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{alerts.counts.expired}</p>
                <p className="text-sm text-muted-foreground">Expired</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-yellow-500/10 flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-yellow-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{alerts.counts.expiringSoon}</p>
                <p className="text-sm text-muted-foreground">Expiring Soon</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-blue-500/10 flex items-center justify-center">
                <Clock className="h-6 w-6 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{pendingDocuments.length}</p>
                <p className="text-sm text-muted-foreground">Pending Review</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-green-500/10 flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{alerts.counts.total - alerts.counts.expired - alerts.counts.expiringSoon}</p>
                <p className="text-sm text-muted-foreground">Up to Date</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Category Breakdown */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Object.entries(CATEGORY_CONFIG).map(([category, config]) => {
          const Icon = config.icon;
          const stats = alerts.counts.byCategory[category] || { expired: 0, expiringSoon: 0 };
          const hasIssues = stats.expired > 0 || stats.expiringSoon > 0;

          return (
            <Card key={category} className={hasIssues ? 'border-orange-500/30' : ''}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={`h-10 w-10 rounded-lg ${config.bgColor} flex items-center justify-center`}>
                    <Icon className={`h-5 w-5 ${config.color}`} />
                  </div>
                  <div>
                    <p className="font-medium">{config.label}</p>
                    <div className="flex gap-2 text-xs">
                      {stats.expired > 0 && (
                        <span className="text-red-600 dark:text-red-400">{stats.expired} expired</span>
                      )}
                      {stats.expiringSoon > 0 && (
                        <span className="text-yellow-600 dark:text-yellow-400">{stats.expiringSoon} expiring</span>
                      )}
                      {!hasIssues && <span className="text-green-600 dark:text-green-400">All good</span>}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Partner Compliance Requests */}
      {pendingPartnerRequests.length > 0 && (
        <Card className="border-orange-500/30 bg-orange-500/5">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Upload className="h-5 w-5 text-orange-500" />
              Partner Document Requests
            </CardTitle>
            <CardDescription>
              Companies need these documents from you to complete your partnership
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Group by company */}
            {Object.values(
              pendingPartnerRequests.reduce(
                (acc, req) => {
                  const companyId = req.requesting_company?.id || '';
                  if (!acc[companyId]) {
                    acc[companyId] = {
                      company: req.requesting_company,
                      requests: [],
                    };
                  }
                  acc[companyId].requests.push(req);
                  return acc;
                },
                {} as Record<string, { company: { id: string; name: string } | null; requests: typeof pendingPartnerRequests }>
              )
            ).map(({ company, requests }) => (
              <div key={company?.id || 'unknown'} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{company?.name || 'Unknown Company'}</span>
                  <Badge variant="outline">{requests.length} needed</Badge>
                </div>
                <div className="space-y-2">
                  {requests.map((request) => (
                    <div
                      key={request.id}
                      className="flex items-center justify-between p-3 bg-background rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="font-medium text-sm">{request.document_type?.name}</p>
                          {request.due_date && (
                            <p className="text-xs text-muted-foreground">
                              Due: {new Date(request.due_date).toLocaleDateString()}
                            </p>
                          )}
                          {request.status === 'rejected' && request.rejection_reason && (
                            <p className="text-xs text-red-500">
                              Rejected: {request.rejection_reason}
                            </p>
                          )}
                        </div>
                      </div>
                      <Button size="sm" asChild>
                        <Link href={`/dashboard/compliance/${request.id}/upload`}>
                          <Upload className="h-4 w-4 mr-1" />
                          Upload
                        </Link>
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Alerts Section */}
      {(alerts.expired.length > 0 || alerts.expiringSoon.length > 0) && (
        <Card className="border-orange-500/30 bg-orange-500/5">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Attention Required
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {alerts.expired.slice(0, 3).map((item) => (
              <ComplianceItemCard key={item.id} item={item} />
            ))}
            {alerts.expiringSoon.slice(0, 3).map((item) => (
              <ComplianceItemCard key={item.id} item={item} />
            ))}
            {(alerts.expired.length + alerts.expiringSoon.length) > 6 && (
              <p className="text-sm text-muted-foreground text-center pt-2">
                And {alerts.expired.length + alerts.expiringSoon.length - 6} more items...
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">All Items ({allItems.length})</TabsTrigger>
          <TabsTrigger value="drivers">Drivers ({driverItems.length})</TabsTrigger>
          <TabsTrigger value="trucks">Trucks ({truckItems.length})</TabsTrigger>
          <TabsTrigger value="trailers">Trailers ({trailerItems.length})</TabsTrigger>
          <TabsTrigger value="documents">Documents ({documents.length})</TabsTrigger>
        </TabsList>

        {/* All Items Tab */}
        <TabsContent value="all" className="space-y-4 mt-4">
          {allItems.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-4" />
                <h3 className="text-lg font-semibold mb-2">No compliance items yet</h3>
                <p className="text-muted-foreground mb-4">
                  Add drivers, trucks, trailers, or upload documents to track expirations
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {allItems.map((item) => (
                <ComplianceItemCard key={item.id} item={item} />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Drivers Tab */}
        <TabsContent value="drivers" className="space-y-4 mt-4">
          {driverItems.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <User className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-muted-foreground">No driver compliance items</p>
                <Button variant="outline" size="sm" className="mt-4" asChild>
                  <Link href="/dashboard/people/drivers">Manage Drivers</Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {driverItems.map((item) => (
                <ComplianceItemCard key={item.id} item={item} />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Trucks Tab */}
        <TabsContent value="trucks" className="space-y-4 mt-4">
          {truckItems.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <Truck className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-muted-foreground">No truck compliance items</p>
                <Button variant="outline" size="sm" className="mt-4" asChild>
                  <Link href="/dashboard/fleet/trucks">Manage Trucks</Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {truckItems.map((item) => (
                <ComplianceItemCard key={item.id} item={item} />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Trailers Tab */}
        <TabsContent value="trailers" className="space-y-4 mt-4">
          {trailerItems.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <Container className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-muted-foreground">No trailer compliance items</p>
                <Button variant="outline" size="sm" className="mt-4" asChild>
                  <Link href="/dashboard/fleet/trailers">Manage Trailers</Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {trailerItems.map((item) => (
                <ComplianceItemCard key={item.id} item={item} />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Documents Tab */}
        <TabsContent value="documents" className="space-y-4 mt-4">
          {documents.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No documents yet</h3>
                <p className="text-muted-foreground mb-4">
                  Upload W-9s, insurance certificates, and hauling agreements
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
              {documents.map((doc) => (
                <DocumentCard key={doc.id} document={doc} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
