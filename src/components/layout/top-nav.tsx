"use client"

import { useMemo, useState } from "react"
import { usePathname, useRouter } from "next/navigation"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ThemeToggle } from "@/components/theme-toggle"
import { NotificationBell } from "@/components/notification-bell"
import { createClient } from "@/lib/supabase-client"
import { cn } from "@/lib/utils"

interface TopNavProps {
  user?: {
    email?: string | null
    fullName?: string | null
  }
  company?: {
    name?: string | null
    dbaName?: string | null
    status?: string | null
  }
  unreadNotifications?: number
}

const routeLabels: Record<string, string> = {
  dashboard: "Overview",
  companies: "Companies",
  loads: "Loads",
  drivers: "Drivers",
  fleet: "Fleet",
  trips: "Trips",
  "live-fleet": "Live Fleet",
}

function getPageLabel(pathname: string) {
  if (!pathname) return "Dashboard"
  const segments = pathname.split("/").filter(Boolean)
  const section = segments[1] ?? segments[0] ?? "dashboard"
  const mapped = routeLabels[section]
  if (mapped) return mapped
  return section
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}

export function TopNav({ user, company, unreadNotifications = 0 }: TopNavProps) {
  const pathname = usePathname() ?? "/dashboard"
  const router = useRouter()
  const [isSigningOut, setIsSigningOut] = useState(false)

  const title = useMemo(() => getPageLabel(pathname), [pathname])
  const derivedInitials = useMemo(() => {
    if (user?.fullName) {
      return user.fullName
        .split(" ")
        .filter(Boolean)
        .map((name) => name[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    }
    return undefined
  }, [user?.fullName])
  const initials = derivedInitials ?? (user?.email?.[0] ?? "Y").toUpperCase()
  const companyDisplayName =
    company?.dbaName?.trim() || company?.name?.trim() || "MoveBoss Pro"
  const userDisplayName = user?.fullName?.trim() || "Fleet Owner"
  const userEmail = user?.email ?? "yoni@moveboss.dev"
  const companyStatusLabel = company?.status
    ? company.status.charAt(0).toUpperCase() + company.status.slice(1)
    : undefined
  const statusToneMap: Record<string, string> = {
    active: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200",
    inactive: "bg-muted text-muted-foreground",
    suspended: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200",
  }
  const statusBadgeClass = company?.status ? statusToneMap[company.status] ?? "bg-muted text-muted-foreground" : undefined

  const handleSignOut = async () => {
    try {
      setIsSigningOut(true)
      const supabase = createClient()
      await supabase.auth.signOut()
      router.push("/login")
      router.refresh()
    } finally {
      setIsSigningOut(false)
    }
  }

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur">
      <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-4">
        <div className="flex min-w-0 flex-col gap-1">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-muted-foreground">
            Workspace
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-semibold text-foreground">{companyDisplayName}</h1>
            <span className="rounded-full border border-border/60 px-2 py-0.5 text-xs capitalize text-muted-foreground">
              {title}
            </span>
            {companyStatusLabel && (
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-xs capitalize",
                  statusBadgeClass,
                )}
              >
                {companyStatusLabel}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <NotificationBell unreadCount={unreadNotifications} />
          <ThemeToggle />
          <div className="flex items-center gap-3 rounded-full border border-border/70 bg-card/60 px-3 py-1.5">
            <div className="hidden text-right sm:flex sm:flex-col">
              <p className="text-sm font-medium text-foreground">{userDisplayName}</p>
              <p className="text-xs text-muted-foreground">{userEmail}</p>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  id="account-menu-trigger"
                  variant="ghost"
                  className="relative h-10 w-10 rounded-full border border-border bg-background/40"
                  aria-label="Account menu"
                >
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-muted text-foreground">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel>
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-foreground">{userDisplayName}</p>
                    <p className="text-xs text-muted-foreground">{userEmail}</p>
                    <p className="text-xs text-muted-foreground">{companyDisplayName}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem disabled>
                  <span className="text-sm text-muted-foreground">Account settings coming soon</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive focus:bg-destructive/10"
                  onSelect={(event) => {
                    event.preventDefault()
                    if (!isSigningOut) {
                      void handleSignOut()
                    }
                  }}
                >
                  {isSigningOut ? "Signing out..." : "Sign out"}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  )
}

