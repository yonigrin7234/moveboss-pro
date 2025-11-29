"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Route, Package, Users, Receipt, BarChart3 } from "lucide-react";

import { cn } from "@/lib/utils";

const items = [
  { href: "/dashboard", label: "Dashboard", icon: Home },
  { href: "/dashboard/trips", label: "Trips", icon: Route },
  { href: "/dashboard/loads", label: "Loads", icon: Package },
  { href: "/dashboard/people/drivers", label: "Drivers", icon: Users },
  { href: "/dashboard/settlements", label: "Statements", icon: Receipt },
  { href: "/dashboard/reports", label: "Reports", icon: BarChart3 },
];

export function MobileNav() {
  const pathname = usePathname() || "";

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 shadow-lg backdrop-blur sm:hidden">
      <div className="grid grid-cols-6">
        {items.map((item) => {
          const Icon = item.icon;
          const active =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-1 px-2 py-2 text-[11px] font-medium transition",
                active ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="h-5 w-5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
