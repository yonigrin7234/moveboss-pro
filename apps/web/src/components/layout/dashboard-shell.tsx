import type { ReactNode } from "react"

import Sidebar from "./sidebar"
import { TopNav } from "./top-nav"
import { MobileNav } from "./mobile-nav"
import { CriticalAlertsBanner } from "@/components/critical-alerts-banner"
import { LoadRequestInterruptModal } from "@/components/load-request-interrupt-modal"
import { IncomingMessageNotifications } from "@/components/incoming-message-notifications"

interface UserPermissions {
  can_manage_drivers?: boolean
  can_manage_vehicles?: boolean
  can_manage_trips?: boolean
  can_manage_loads?: boolean
  can_view_financials?: boolean
}

interface DashboardShellProps {
  children: ReactNode
  userId?: string
  user?: {
    email?: string | null
    fullName?: string | null
  }
  company?: {
    id?: string
    name?: string | null
    dbaName?: string | null
    status?: string | null
    isBroker?: boolean
    isCarrier?: boolean
    fmcsaVerified?: boolean | null
    fmcsaAllowedToOperate?: boolean | null
    fmcsaCommonAuthority?: string | null
    fmcsaLastChecked?: string | null
  }
  role?: string | null
  unreadNotifications?: number
  permissions?: UserPermissions | null
}

export function DashboardShell({ children, userId, user, company, role, unreadNotifications, permissions }: DashboardShellProps) {
  const companyName = company?.dbaName || company?.name
  const userName = user?.fullName || user?.email

  return (
    <div className="flex min-h-screen bg-background text-foreground antialiased">
      <Sidebar
        canPostLoads={company?.isBroker ?? false}
        canHaulLoads={company?.isCarrier ?? false}
        permissions={permissions}
      />
      <div className="flex flex-1 flex-col min-w-0 pb-16 sm:pb-0 md:ml-60">
        <TopNav user={user} company={company} unreadNotifications={unreadNotifications} />
        <CriticalAlertsBanner userId={userId} />
        <main className="flex-1 px-4 py-5 sm:px-6 lg:px-8 min-w-0 max-w-[1600px]">
          <div className="space-y-5">
            {children}
          </div>
        </main>
      </div>
      <MobileNav />
      {/* Interrupt modal for new load requests - only for brokers */}
      {company?.isBroker && (
        <LoadRequestInterruptModal userId={userId} />
      )}
      {/* Global incoming message notifications */}
      <IncomingMessageNotifications userId={userId} companyId={company?.id} />
    </div>
  )
}

