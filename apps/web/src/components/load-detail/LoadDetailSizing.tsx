'use client';

import { Package, DollarSign, Building2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { LoadDetailViewModel } from '@/lib/load-detail-model';
import { formatRate, formatCurrency } from '@/lib/load-detail-model';

interface LoadDetailSizingProps {
  model: LoadDetailViewModel;
}

export function LoadDetailSizing({ model }: LoadDetailSizingProps) {
  const hasSize =
    model.size.estimatedCuft ||
    model.size.estimatedWeight ||
    model.size.piecesCount ||
    model.size.actualCuft;

  const hasPricing =
    model.pricing.rate ||
    model.pricing.ratePerCuft ||
    model.pricing.linehaul ||
    model.pricing.totalRevenue ||
    model.pricing.carrierRate;

  if (!hasSize && !hasPricing) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Load Details Card */}
      {hasSize && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Load Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {model.size.estimatedCuft && (
                <div>
                  <p className="text-sm text-muted-foreground">Size</p>
                  <p className="font-medium">{model.size.estimatedCuft.toLocaleString()} cuft</p>
                </div>
              )}
              {model.size.actualCuft && (
                <div>
                  <p className="text-sm text-muted-foreground">Actual Size</p>
                  <p className="font-medium">{model.size.actualCuft.toLocaleString()} cuft</p>
                </div>
              )}
              {model.size.estimatedWeight && (
                <div>
                  <p className="text-sm text-muted-foreground">Weight</p>
                  <p className="font-medium">{model.size.estimatedWeight.toLocaleString()} lbs</p>
                </div>
              )}
              {model.size.piecesCount && (
                <div>
                  <p className="text-sm text-muted-foreground">Pieces</p>
                  <p className="font-medium">{model.size.piecesCount}</p>
                </div>
              )}
              {model.pricing.ratePerCuft && (
                <div>
                  <p className="text-sm text-muted-foreground">Rate</p>
                  <p className="font-medium text-green-600 dark:text-green-400">
                    ${model.pricing.ratePerCuft.toFixed(2)}/CF
                  </p>
                </div>
              )}
            </div>

            {model.pricing.balanceDue !== undefined && model.pricing.balanceDue > 0 && model.isPickup && (
              <div className="pt-2 border-t">
                <p className="text-sm text-muted-foreground">Balance Due on Pickup</p>
                <p className="font-medium text-lg">{formatCurrency(model.pricing.balanceDue)}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Partner Company Card */}
      {model.partnerCompany && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              {model.context === 'owner' ? 'Partner Company' : 'Source Company'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold">{model.partnerCompany.name}</p>
            {model.partnerCompany.city && model.partnerCompany.state && (
              <p className="text-muted-foreground">
                {model.partnerCompany.city}, {model.partnerCompany.state}
              </p>
            )}
            {model.partnerCompany.phone && (
              <p className="text-sm text-muted-foreground mt-2">
                <a href={`tel:${model.partnerCompany.phone}`} className="text-blue-600 hover:underline">
                  {model.partnerCompany.phone}
                </a>
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Pricing Card - for carrier views */}
      {model.context !== 'owner' && hasPricing && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Your Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-600 dark:text-green-400">
              {formatRate(
                model.pricing.carrierRate || model.pricing.rate,
                model.pricing.rateType,
                model.size.estimatedCuft
              )}
            </p>
            {model.partnerCompany && (
              <p className="text-sm text-muted-foreground mt-1">
                From {model.partnerCompany.name}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Revenue Card - for owner views */}
      {model.context === 'owner' && hasPricing && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Revenue
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {model.pricing.totalRevenue && (
              <div>
                <p className="text-sm text-muted-foreground">Total Rate</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {formatCurrency(model.pricing.totalRevenue)}
                </p>
              </div>
            )}
            {model.pricing.linehaul && (
              <div className="pt-2 border-t">
                <p className="text-sm text-muted-foreground">Linehaul</p>
                <p className="font-medium">{formatCurrency(model.pricing.linehaul)}</p>
              </div>
            )}
            {model.pricing.rate && !model.pricing.totalRevenue && (
              <div>
                <p className="text-sm text-muted-foreground">Rate</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {formatCurrency(model.pricing.rate)}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
