"use client";

import { CheckCircle } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { TripTotals } from "@/data/driver-workflow";

interface TripCompletedCardProps {
  trip: {
    completed_at?: string | null;
    completion_notes?: string | null;
  };
  tripTotals: TripTotals;
  loadsCount: number;
}

export function TripCompletedCard({ trip, tripTotals, loadsCount }: TripCompletedCardProps) {
  const completedDate = trip.completed_at ? new Date(trip.completed_at) : null;

  return (
    <Card className="border-green-500/30 bg-green-500/5">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-green-600">
          <CheckCircle className="h-6 w-6" />
          Trip Completed
        </CardTitle>
        {completedDate && (
          <CardDescription>
            Completed on {completedDate.toLocaleDateString()} at {completedDate.toLocaleTimeString()}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Final Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-muted/50 p-3 rounded-lg text-center">
            <p className="text-2xl font-bold text-foreground">
              {tripTotals.actualMiles > 0 ? tripTotals.actualMiles.toLocaleString() : "—"}
            </p>
            <p className="text-xs text-muted-foreground">Miles Driven</p>
          </div>

          <div className="bg-muted/50 p-3 rounded-lg text-center">
            <p className="text-2xl font-bold text-foreground">{loadsCount}</p>
            <p className="text-xs text-muted-foreground">Loads Delivered</p>
          </div>

          <div className="bg-muted/50 p-3 rounded-lg text-center">
            <p className="text-2xl font-bold text-green-600">${tripTotals.totalCollected.toFixed(0)}</p>
            <p className="text-xs text-muted-foreground">Collected</p>
          </div>

          <div className="bg-muted/50 p-3 rounded-lg text-center">
            <p className="text-2xl font-bold text-foreground">${tripTotals.totalExpenses.toFixed(0)}</p>
            <p className="text-xs text-muted-foreground">Expenses</p>
          </div>
        </div>

        {/* Additional Stats */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Total Revenue</span>
            <span className="font-medium">${tripTotals.totalRevenue.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Total Cubic Feet</span>
            <span className="font-medium">{tripTotals.totalCuft.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Receivables</span>
            <span className={`font-medium ${tripTotals.receivables >= 0 ? "text-green-600" : "text-red-600"}`}>
              ${tripTotals.receivables.toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Driver Reimbursement</span>
            <span className="font-medium text-green-600">${tripTotals.driverPaidExpenses.toFixed(2)}</span>
          </div>
        </div>

        {/* Completion Notes */}
        {trip.completion_notes && (
          <div className="bg-muted/50 p-3 rounded-lg">
            <p className="text-xs text-muted-foreground mb-1">Completion Notes</p>
            <p className="text-sm text-foreground">{trip.completion_notes}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
