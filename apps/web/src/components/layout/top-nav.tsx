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
import { Search } from "lucide-react"
import { createClient } from "@/lib/supabase-client"
import { cn } from "@/lib/utils"
import { FMCSAVerificationBadge } from "@/components/FMCSAVerificationBadge"
import { Logo } from "@/components/ui/logo"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"

// Convert string to Title Case (proper capitalization)
function toTitleCase(str: string): string {
  return str
    .toLowerCase()
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
}

interface TopNavProps {
  user?: {
    email?: string | null
    fullName?: string | null
  }
  company?: {
    name?: string | null
    dbaName?: string | null
    status?: string | null
    fmcsaVerified?: boolean | null
    fmcsaAllowedToOperate?: boolean | null
    fmcsaCommonAuthority?: string | null
    fmcsaLastChecked?: string | null
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
  const companyDisplayName = toTitleCase(
    company?.dbaName?.trim() || company?.name?.trim() || "MoveBoss Pro"
  )
  const userDisplayName = toTitleCase(user?.fullName?.trim() || "Fleet Owner")
  const userEmail = user?.email ?? "yoni@moveboss.dev"
  const companyStatusLabel = company?.status
    ? company.status.charAt(0).toUpperCase() + company.status.slice(1)
    : undefined
  const statusToneMap: Record<string, string> = {
    active: "bg-success/10 text-success border border-success/20",
    inactive: "bg-muted text-muted-foreground border border-border",
    suspended: "bg-warning/15 text-warning-foreground border border-warning/25",
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
    <header className="sticky top-0 z-30 border-b border-border/50 bg-background/95 backdrop-blur-sm supports-[backdrop-filter]:bg-background/80">
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
        {/* Mobile logo - only visible when sidebar is hidden */}
        <Link href="/dashboard" className="flex items-center gap-2 md:hidden">
          <Logo size={28} className="shrink-0 text-primary" />
          <div className="flex items-center gap-1">
            <span className="text-sm font-bold text-foreground">MoveBoss</span>
            <Badge variant="secondary" className="h-4 px-1 text-[9px] font-semibold bg-primary text-primary-foreground">
              PRO
            </Badge>
          </div>
        </Link>
        <div className="hidden min-w-0 flex-col gap-0.5 md:flex">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-lg font-semibold text-foreground tracking-tight">{title}</h1>
            {companyStatusLabel && (
              <span
                className={cn(
                  "rounded-md px-2 py-0.5 text-[11px] font-medium capitalize",
                  statusBadgeClass,
                )}
              >
                {companyStatusLabel}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <p className="text-xs text-muted-foreground">
              {companyDisplayName}
            </p>
            <FMCSAVerificationBadge
              fmcsaVerified={company?.fmcsaVerified}
              fmcsaAllowedToOperate={company?.fmcsaAllowedToOperate}
              fmcsaCommonAuthority={company?.fmcsaCommonAuthority}
              fmcsaLastChecked={company?.fmcsaLastChecked}
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={() => {
              const event = new KeyboardEvent('keydown', {
                key: 'k',
                metaKey: true,
                ctrlKey: false,
                bubbles: true,
              });
              document.dispatchEvent(event);
            }}
            title="Search (⌘K)"
          >
            <Search className="h-4 w-4" />
          </Button>
          <NotificationBell unreadCount={unreadNotifications} />
          <ThemeToggle />
          <div className="h-5 w-px bg-border/50 mx-1 hidden sm:block" />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                id="account-menu-trigger"
                variant="ghost"
                className="relative h-8 gap-2 rounded-lg px-2 hover:bg-accent"
                aria-label="Account menu"
              >
                <Avatar className="h-7 w-7">
                  <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden text-sm font-medium text-foreground sm:inline-block">
                  {userDisplayName}
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-semibold text-foreground">{userDisplayName}</p>
                  <p className="text-xs text-muted-foreground">{userEmail}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/dashboard/settings/account">
                  Account settings
                </Link>
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
    </header>
  )
}

