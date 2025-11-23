import type { ReactNode } from "react"
import { redirect } from "next/navigation"

import { getMembershipsForUser, getWorkspaceCompanyForUser } from "@/data/companies"
import { DashboardShell } from "@/components/layout/dashboard-shell"
import { WorkspaceProvider } from "@/components/layout/WorkspaceContext"
import { getCurrentUser } from "@/lib/supabase-server"

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode
}) {
  const user = await getCurrentUser()

  if (!user) {
    redirect("/login")
  }

  const fullName =
    (user?.user_metadata?.full_name as string | undefined) ||
    (user?.user_metadata?.name as string | undefined)
  const [workspaceCompany, memberships] = await Promise.all([
    getWorkspaceCompanyForUser(user.id),
    getMembershipsForUser(user.id),
  ])
  const companySummary = workspaceCompany
    ? {
        id: workspaceCompany.id,
        name: workspaceCompany.name,
        dbaName: (workspaceCompany as any).dba_name,
        status: workspaceCompany.status,
      }
    : undefined

  return (
    <WorkspaceProvider
      value={{
        user: { id: user.id, email: user?.email, fullName },
        workspaceCompany: workspaceCompany
          ? {
              id: workspaceCompany.id,
              name: workspaceCompany.name,
              dba_name: (workspaceCompany as any).dba_name,
              status: workspaceCompany.status,
              owner_id: workspaceCompany.owner_id,
            }
          : null,
        memberships,
      }}
    >
      <DashboardShell user={{ email: user?.email, fullName }} company={companySummary}>
        {children}
      </DashboardShell>
    </WorkspaceProvider>
  )
}

