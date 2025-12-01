import type { ReactNode } from "react"
import { redirect } from "next/navigation"

import { getMembershipsForUser, getWorkspaceCompanyForUser } from "@/data/companies"
import { getUnreadNotificationCount } from "@/data/notifications"
import { getOnboardingState } from "@/data/onboarding"
import { DashboardShell } from "@/components/layout/dashboard-shell"
import { WorkspaceProvider } from "@/components/layout/WorkspaceContext"
import { getCurrentUser, getCurrentUserPermissions } from "@/lib/supabase-server"

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

  // Fetch all layout data with error resilience
  let workspaceCompany = null
  let memberships: Awaited<ReturnType<typeof getMembershipsForUser>> = []
  let unreadNotifications = 0
  let onboardingState = null
  let permissions = null

  try {
    [workspaceCompany, memberships, unreadNotifications, onboardingState, permissions] = await Promise.all([
      getWorkspaceCompanyForUser(user.id),
      getMembershipsForUser(user.id),
      getUnreadNotificationCount(user.id),
      getOnboardingState(user.id),
      getCurrentUserPermissions(),
    ])
  } catch (error) {
    console.error('[DashboardLayout] Error fetching layout data:', error)
    // Continue with defaults - the UI will show appropriate empty states
  }
  const companySummary = workspaceCompany
    ? {
        id: workspaceCompany.id,
        name: workspaceCompany.name,
        dbaName: workspaceCompany.dba_name,
        status: workspaceCompany.status,
        isBroker: workspaceCompany.is_broker ?? false,
        isCarrier: workspaceCompany.is_carrier ?? false,
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
              dba_name: workspaceCompany.dba_name,
              status: workspaceCompany.status,
              owner_id: workspaceCompany.owner_id,
            }
          : null,
        memberships,
      }}
    >
      <DashboardShell
        user={{ email: user?.email, fullName }}
        company={companySummary}
        role={onboardingState?.role}
        unreadNotifications={unreadNotifications}
        permissions={permissions}
      >
        {children}
      </DashboardShell>
    </WorkspaceProvider>
  )
}

