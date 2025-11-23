import { redirect } from "next/navigation"

import { getCurrentUser } from "@/lib/supabase-server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default async function HelpersPage() {
  const user = await getCurrentUser()
  if (!user) {
    redirect("/login")
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Crew & Helpers</h1>
        <p className="text-sm text-muted-foreground">
          Track non-driver crew members and helpers. This workspace is coming soon.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Coming soon</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>We&apos;re building a dedicated experience for crew and helpers with roles, schedules, and payroll views.</p>
          <p>For now, continue managing drivers from the People section.</p>
        </CardContent>
      </Card>
    </div>
  )
}
