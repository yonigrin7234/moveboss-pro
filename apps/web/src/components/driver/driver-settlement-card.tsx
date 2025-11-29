"use client";

import { DollarSign, TrendingUp, ArrowDownCircle, ArrowUpCircle, Calculator } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { DriverSettlementPreview } from "@/data/driver-workflow";

interface DriverSettlementCardProps {
  settlement: DriverSettlementPreview;
  tripStatus: string;
}

const payModeLabels: Record<string, string> = {
  per_mile: "Per Mile",
  per_cuft: "Per Cubic Foot",
  per_mile_and_cuft: "Per Mile + Cubic Foot",
  percent_of_revenue: "% of Revenue",
  flat_daily_rate: "Daily Rate",
};

export function DriverSettlementCard({ settlement, tripStatus }: DriverSettlementCardProps) {
  const isCompleted = tripStatus === "completed" || tripStatus === "settled";
  const netIsPositive = settlement.netPay >= 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Calculator className="h-5 w-5 text-primary" />
          {isCompleted ? "Settlement Summary" : "Estimated Settlement"}
        </CardTitle>
        {!isCompleted && (
          <p className="text-xs text-muted-foreground">
            This is an estimate based on current trip data. Final settlement will be calculated when trip is completed.
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Gross Pay Section */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
              <TrendingUp className="h-4 w-4 text-blue-500" />
              Gross Pay ({payModeLabels[settlement.payMode] || settlement.payMode})
            </span>
            <span className="font-semibold text-foreground">${settlement.grossPay.toFixed(2)}</span>
          </div>
          {settlement.payBreakdown.length > 0 && (
            <div className="pl-6 space-y-1">
              {settlement.payBreakdown.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{item.calculation || item.label}</span>
                  <span>${item.amount.toFixed(2)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Reimbursements Section */}
        {settlement.reimbursements > 0 && (
          <div className="space-y-2 pt-2 border-t border-border">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                <ArrowUpCircle className="h-4 w-4 text-green-500" />
                Reimbursements
              </span>
              <span className="font-semibold text-green-600">+${settlement.reimbursements.toFixed(2)}</span>
            </div>
            {settlement.reimbursementItems.length > 0 && (
              <div className="pl-6 space-y-1">
                {settlement.reimbursementItems.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="capitalize">{item.description.replace(/_/g, " ")}</span>
                    <span>${item.amount.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Collections Section */}
        {settlement.collections > 0 && (
          <div className="space-y-2 pt-2 border-t border-border">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                <ArrowDownCircle className="h-4 w-4 text-amber-500" />
                Collections (Cash/Check to turn in)
              </span>
              <span className="font-semibold text-amber-600">-${settlement.collections.toFixed(2)}</span>
            </div>
            {settlement.collectionItems.length > 0 && (
              <div className="pl-6 space-y-1">
                {settlement.collectionItems.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>
                      Load {item.loadNumber} ({item.method})
                    </span>
                    <span>${item.amount.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Net Pay Section */}
        <div className="pt-3 border-t-2 border-border">
          <div className="flex items-center justify-between">
            <span className="text-base font-semibold text-foreground flex items-center gap-1.5">
              <DollarSign className="h-5 w-5" />
              {isCompleted ? "Net Pay" : "Estimated Net Pay"}
            </span>
            <span className={`text-xl font-bold ${netIsPositive ? "text-green-600" : "text-red-600"}`}>
              {netIsPositive ? "" : "-"}${Math.abs(settlement.netPay).toFixed(2)}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Gross Pay + Reimbursements - Collections = Net
          </p>
        </div>

        {/* Trip Metrics */}
        <div className="pt-3 border-t border-border">
          <p className="text-xs font-medium text-muted-foreground mb-2">Trip Metrics</p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Miles:</span>
              <span className="font-medium">{settlement.metrics.actualMiles.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Cubic Feet:</span>
              <span className="font-medium">{settlement.metrics.totalCuft.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Revenue:</span>
              <span className="font-medium">${settlement.metrics.totalRevenue.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Days:</span>
              <span className="font-medium">{settlement.metrics.daysWorked}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
