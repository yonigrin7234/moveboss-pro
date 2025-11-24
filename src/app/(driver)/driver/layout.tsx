import type { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentDriverForSession } from "@/data/driver-workflow";
import { DriverHeader } from "@/components/driver/driver-header";

export default async function DriverLayout({ children }: { children: ReactNode }) {
  const driver = await getCurrentDriverForSession();
  if (!driver) {
    redirect("/driver-login");
  }

  const driverName = [driver.first_name, driver.last_name].filter(Boolean).join(" ") || "Driver";

  return (
    <div className="min-h-screen bg-background text-foreground">
      <DriverHeader driverName={driverName} />
      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-10 space-y-6">{children}</main>
    </div>
  );
}
