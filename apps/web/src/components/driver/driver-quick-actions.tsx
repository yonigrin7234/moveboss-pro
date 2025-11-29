"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { LifeBuoy, ListChecks, LogOut, RefreshCcw } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase-client";

interface DriverQuickActionsProps {
  activeTripId?: string | null;
}

export function DriverQuickActions({ activeTripId }: DriverQuickActionsProps) {
  const [signingOut, setSigningOut] = useState(false);
  const router = useRouter();

  const handleSignOut = async () => {
    setSigningOut(true);
    const supabase = createClient();
    try {
      await supabase.auth.signOut();
      router.push("/driver-login");
      router.refresh();
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <Card className="border-primary/20 bg-card/80">
      <CardHeader className="pb-4">
        <CardTitle className="text-base font-semibold text-foreground">Quick actions</CardTitle>
        <CardDescription>
          Jump to the right spot, refresh your data, or log out when you&apos;re finished.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <Button asChild variant="secondary" className="justify-start">
          <Link href={activeTripId ? `/driver/trips/${activeTripId}` : "/driver/trips"}>
            <ListChecks className="mr-2 h-4 w-4" />
            {activeTripId ? "Open active trip" : "See trips"}
          </Link>
        </Button>
        <Button variant="outline" className="justify-start" onClick={() => router.refresh()}>
          <RefreshCcw className="mr-2 h-4 w-4" />
          Refresh data
        </Button>
        <Button asChild variant="ghost" className="justify-start">
          <Link href="mailto:support@moveboss.com?subject=Driver%20Support">
            <LifeBuoy className="mr-2 h-4 w-4" />
            Get help
          </Link>
        </Button>
        <Button
          variant="destructive"
          className="justify-start"
          onClick={handleSignOut}
          disabled={signingOut}
        >
          <LogOut className="mr-2 h-4 w-4" />
          {signingOut ? "Signing out..." : "Log out"}
        </Button>
      </CardContent>
    </Card>
  );
}
