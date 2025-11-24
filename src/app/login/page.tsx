"use client";

import Link from "next/link";
import { ArrowRight, ShieldCheck, Truck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const cards = [
  {
    title: "Owner / Dispatch",
    description: "Full dashboard access for managing fleet, trips, settlements, and finance.",
    href: "/login/owner",
    icon: ShieldCheck,
  },
  {
    title: "Driver",
    description: "Mobile-friendly portal for trips, loads, odometer, and expenses.",
    href: "/driver-login",
    icon: Truck,
  },
];

export default function LoginSelectorPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted px-4">
      <div className="w-full max-w-3xl space-y-6 rounded-2xl border border-border bg-background p-8 shadow-lg">
        <div className="space-y-2 text-center">
          <p className="text-xs uppercase tracking-[0.35em] text-muted-foreground">MoveBoss Pro</p>
          <h1 className="text-2xl font-semibold text-foreground">Choose your portal</h1>
          <p className="text-sm text-muted-foreground">
            Select the experience that matches your role. Credentials stay the same.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {cards.map((card) => {
            const Icon = card.icon;
            return (
              <Link
                key={card.href}
                href={card.href}
                className={cn(
                  "group relative flex h-full flex-col justify-between rounded-xl border border-border bg-card p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-md"
                )}
              >
                <div className="space-y-3">
                  <div className="inline-flex items-center gap-2 rounded-full bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground">
                    <Icon className="h-4 w-4 text-primary" />
                    {card.title}
                  </div>
                  <p className="text-sm text-muted-foreground">{card.description}</p>
                </div>
                <Button
                  variant="ghost"
                  className="mt-4 flex w-full items-center justify-between px-0 text-sm text-primary"
                >
                  Continue <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                </Button>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
