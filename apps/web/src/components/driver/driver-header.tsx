"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase-client";

interface DriverHeaderProps {
  driverName: string;
}

export function DriverHeader({ driverName }: DriverHeaderProps) {
  const router = useRouter();

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/driver-login");
    router.refresh();
  };

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-card/80 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:px-6">
        <div className="flex flex-col">
          <p className="text-xs uppercase tracking-[0.35em] text-muted-foreground">MoveBoss Driver</p>
          <span className="text-sm font-semibold text-foreground">{driverName || "Driver"}</span>
        </div>
        <nav className="flex items-center gap-3 text-sm text-muted-foreground">
          <Link className="hover:text-foreground" href="/driver">
            Home
          </Link>
          <Link className="hover:text-foreground" href="/driver/trips">
            Trips
          </Link>
          <Button size="sm" variant="outline" onClick={handleSignOut}>
            Log out
          </Button>
        </nav>
      </div>
    </header>
  );
}
