"use client";

import { AlertTriangle, CheckCircle, ShieldCheck, Banknote } from "lucide-react";
import { generatePreDeliveryCheck, type PreDeliveryCheckInput, type TrustLevel } from "@/lib/load-financial-utils";

interface PreDeliveryCheckCardProps {
  load: Record<string, any>;
  company: { name: string; trust_level?: TrustLevel } | null;
  codReceived?: boolean;
  companyApprovedException?: boolean;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
}

export function PreDeliveryCheckCard({
  load,
  company,
  codReceived = false,
  companyApprovedException = false,
}: PreDeliveryCheckCardProps) {
  // Only show for loaded status (ready for delivery)
  if (load.load_status !== "loaded") return null;

  const trustLevel: TrustLevel = company?.trust_level || "cod_required";

  const input: PreDeliveryCheckInput = {
    actual_cuft_loaded: load.actual_cuft_loaded,
    rate_per_cuft: load.rate_per_cuft,
    contract_rate_per_cuft: load.contract_rate_per_cuft,
    balance_due_on_delivery: load.balance_due_on_delivery,
    contract_accessorials_total: load.contract_accessorials_total,
    trust_level: trustLevel,
    company_name: company?.name || "Company",
    cod_received: codReceived || load.cod_received,
    company_approved_exception: companyApprovedException || load.company_approved_exception,
  };

  const check = generatePreDeliveryCheck(input);

  const alertStyles = {
    success: "bg-emerald-50 border-emerald-200 text-emerald-800",
    warning: "bg-amber-50 border-amber-200 text-amber-800",
    danger: "bg-red-50 border-red-200 text-red-800",
  };

  const iconStyles = {
    success: "text-emerald-600",
    warning: "text-amber-600",
    danger: "text-red-600",
  };

  const AlertIcon = check.alertLevel === "danger" ? AlertTriangle : CheckCircle;
  const TrustIcon = check.isTrusted ? ShieldCheck : Banknote;

  return (
    <div className={`rounded-lg border p-4 shadow-sm ${alertStyles[check.alertLevel]}`}>
      <div className="flex items-start gap-3">
        <AlertIcon className={`h-6 w-6 flex-shrink-0 mt-0.5 ${iconStyles[check.alertLevel]}`} />
        <div className="flex-1 space-y-3">
          {/* Status Header */}
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-base font-semibold">Pre-Delivery Check</h4>
              <span className="flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-white/50">
                <TrustIcon className="h-3 w-3" />
                {check.isTrusted ? "Trusted" : "COD Required"}
              </span>
            </div>
            <p className="text-sm mt-1">{check.statusMessage}</p>
          </div>

          {/* Financial Breakdown */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
            <div className="bg-white/40 rounded p-2">
              <p className="text-xs uppercase opacity-75">Your Rate</p>
              <p className="font-semibold">{formatCurrency(check.carrierRate)}</p>
            </div>
            <div className="bg-white/40 rounded p-2">
              <p className="text-xs uppercase opacity-75">Customer Pays</p>
              <p className="font-semibold">{formatCurrency(check.customerBalance)}</p>
            </div>
            <div className="bg-white/40 rounded p-2">
              <p className="text-xs uppercase opacity-75">Shortfall</p>
              <p className="font-semibold">{formatCurrency(check.shortfall)}</p>
            </div>
            {check.requiresCOD && (
              <div className="bg-red-100/60 rounded p-2">
                <p className="text-xs uppercase opacity-75">COD Required</p>
                <p className="font-bold text-red-700">{formatCurrency(check.codAmountRequired)}</p>
              </div>
            )}
          </div>

          {/* Action Required */}
          <div className="rounded bg-white/60 p-3">
            <p className="text-xs uppercase font-medium mb-1">Action Required</p>
            <p className="text-sm font-medium">{check.actionRequired}</p>
          </div>

          {/* Warning for COD Required */}
          {check.requiresCOD && (
            <div className="flex items-center gap-2 rounded bg-red-100 p-3 border border-red-300">
              <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0" />
              <p className="text-sm font-bold text-red-700">
                DO NOT UNLOAD until you receive {formatCurrency(check.codAmountRequired)} from {company?.name}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
