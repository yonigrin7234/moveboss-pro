import Link from 'next/link';
import {
  Search,
  Upload,
  Plus,
  Users,
  Package,
  Clipboard,
  DollarSign,
  Truck,
  ArrowRight,
  Building2,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import type { DashboardMode } from '@/lib/dashboardMode';

interface QuickAction {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface QuickActionsProps {
  mode: DashboardMode;
}

function PrimaryActionButton({ label, href, icon: Icon }: QuickAction) {
  return (
    <Link href={href} className="group block">
      <div className="relative overflow-hidden p-3 rounded-xl bg-gradient-to-br from-primary to-primary/80 shadow-md hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-white/20">
            <Icon className="h-4 w-4 text-white" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-white">{label}</p>
          </div>
          <ArrowRight className="h-3.5 w-3.5 text-white/80 group-hover:translate-x-1 transition-transform" />
        </div>
      </div>
    </Link>
  );
}

function SecondaryActionButton({ label, href, icon: Icon }: QuickAction) {
  return (
    <Link href={href} className="group block">
      <div className="p-2 rounded-lg border border-border bg-card hover:bg-accent transition-colors">
        <div className="flex items-center gap-2">
          <div className="p-1 rounded-md bg-primary/10">
            <Icon className="h-3.5 w-3.5 text-primary" />
          </div>
          <span className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors">
            {label}
          </span>
        </div>
      </div>
    </Link>
  );
}

function TertiaryActionButton({ label, href, icon: Icon }: QuickAction) {
  return (
    <Link href={href} className="group block">
      <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-muted/50 hover:bg-muted transition-colors h-8">
        <Icon className="h-3 w-3 text-muted-foreground group-hover:text-foreground transition-colors" />
        <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">
          {label}
        </span>
      </div>
    </Link>
  );
}

export function QuickActions({ mode }: QuickActionsProps) {
  // Carrier/Hybrid primary and secondary actions
  const carrierPrimary: QuickAction = { label: 'Load Board', href: '/dashboard/load-board', icon: Search };
  const carrierSecondary: QuickAction[] = [
    { label: 'Assigned Loads', href: '/dashboard/assigned-loads', icon: Package },
    { label: 'Active Trips', href: '/dashboard/trips', icon: Truck },
  ];
  const carrierTertiary: QuickAction[] = [
    { label: 'Drivers', href: '/dashboard/drivers', icon: Users },
    { label: 'Companies', href: '/dashboard/companies', icon: Building2 },
  ];

  // Broker primary and secondary actions
  const brokerPrimary: QuickAction = { label: 'Post Load', href: '/dashboard/post-load', icon: Upload };
  const brokerSecondary: QuickAction[] = [
    { label: 'Posted Jobs', href: '/dashboard/posted-jobs', icon: Clipboard },
    { label: 'Requests', href: '/dashboard/carrier-requests', icon: Truck },
  ];
  const brokerTertiary: QuickAction[] = [
    { label: 'Receivables', href: '/dashboard/finance/receivables', icon: DollarSign },
    { label: 'Companies', href: '/dashboard/companies', icon: Building2 },
  ];

  if (mode === 'carrier') {
    return (
      <Card className="rounded-xl shadow-sm">
        <CardContent className="p-4 space-y-2.5">
          {/* Primary Action */}
          <PrimaryActionButton {...carrierPrimary} />

          {/* Secondary Actions */}
          <div className="grid grid-cols-2 gap-2">
            {carrierSecondary.map((action) => (
              <SecondaryActionButton key={action.label} {...action} />
            ))}
          </div>

          {/* Tertiary Actions */}
          <div className="flex flex-wrap gap-1.5 pt-1">
            {carrierTertiary.map((action) => (
              <TertiaryActionButton key={action.label} {...action} />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (mode === 'broker') {
    return (
      <Card className="rounded-xl shadow-sm">
        <CardContent className="p-4 space-y-2.5">
          {/* Primary Action */}
          <PrimaryActionButton {...brokerPrimary} />

          {/* Secondary Actions */}
          <div className="grid grid-cols-2 gap-2">
            {brokerSecondary.map((action) => (
              <SecondaryActionButton key={action.label} {...action} />
            ))}
          </div>

          {/* Tertiary Actions */}
          <div className="flex flex-wrap gap-1.5 pt-1">
            {brokerTertiary.map((action) => (
              <TertiaryActionButton key={action.label} {...action} />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Hybrid mode - show both with visual separation
  return (
    <Card className="rounded-xl shadow-sm">
      <CardContent className="p-4 space-y-3">
        {/* Carrier Actions Section */}
        <div>
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">
            My Fleet
          </p>
          <div className="space-y-2.5">
            <PrimaryActionButton {...carrierPrimary} />
            <div className="grid grid-cols-2 gap-2">
              {carrierSecondary.map((action) => (
                <SecondaryActionButton key={action.label} {...action} />
              ))}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {carrierTertiary.map((action) => (
                <TertiaryActionButton key={action.label} {...action} />
              ))}
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-border/40" />

        {/* Broker Actions Section */}
        <div>
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">
            Marketplace
          </p>
          <div className="space-y-2.5">
            <PrimaryActionButton {...brokerPrimary} />
            <div className="grid grid-cols-2 gap-2">
              {brokerSecondary.map((action) => (
                <SecondaryActionButton key={action.label} {...action} />
              ))}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {brokerTertiary.map((action) => (
                <TertiaryActionButton key={action.label} {...action} />
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
