import type { ReactNode } from "react"

import Sidebar from "./sidebar"
import { TopNav } from "./top-nav"
import { MobileNav } from "./mobile-nav"

interface DashboardShellProps {
  children: ReactNode
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
  }
  role?: string | null
  unreadNotifications?: number
}

export function DashboardShell({ children, user, company, role, unreadNotifications }: DashboardShellProps) {
  const companyName = company?.dbaName || company?.name
  const userName = user?.fullName || user?.email

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <Sidebar
        companyName={companyName}
        userName={userName}
        canPostLoads={company?.isBroker ?? false}
        canHaulLoads={company?.isCarrier ?? false}
        role={role}
      />
      <div className="flex flex-1 flex-col min-w-0 pb-16 sm:pb-0">
        <TopNav user={user} company={company} unreadNotifications={unreadNotifications} />
        <main className="flex-1 space-y-6 px-4 py-6 sm:px-6 lg:px-10 min-w-0">
          {children}
        </main>
      </div>
      <MobileNav />
    </div>
  )
}

