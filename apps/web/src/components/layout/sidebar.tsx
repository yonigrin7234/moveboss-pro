"use client"

import { useState, useEffect, useMemo } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  Building2,
  ClipboardList,
  ClipboardCheck,
  Users,
  Truck,
  Boxes,
  MapPin,
  Route,
  Warehouse,
  User,
  UserCog,
  Wallet,
  Receipt,
  CreditCard,
  BarChart3,
  Settings as SettingsIcon,
  ShieldCheck,
  Plug,
  ChevronRight,
  Radio,
  Handshake,
  FileCheck,
  Search,
  Send,
  Upload,
  PackagePlus,
  FileText,
  Package,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type NavItem = {
  label: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  children?: NavItem[]
  section?: "posting" | "carrier" | "general"
}

type UserPermissions = {
  can_manage_drivers?: boolean
  can_manage_vehicles?: boolean
  can_manage_trips?: boolean
  can_manage_loads?: boolean
  can_view_financials?: boolean
}

type SidebarProps = {
  companyName?: string | null
  userName?: string | null
  canPostLoads?: boolean
  canHaulLoads?: boolean
  role?: string | null
  permissions?: UserPermissions | null
}

function getInitials(label: string): string {
  const initials = label
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase()

  if (initials.length > 0) {
    return initials
  }

  return label.slice(0, 2).toUpperCase() || "MB"
}

function getRoleBadge(canPostLoads: boolean, canHaulLoads: boolean, role?: string | null): string {
  if (role === "owner_operator") return "Owner-Operator"
  if (canPostLoads && canHaulLoads) return "Moving Company"
  if (canPostLoads) return "Broker"
  if (canHaulLoads) return "Carrier"
  return "Company"
}

function isChildActive(pathname: string, child: NavItem): boolean {
  return pathname === child.href || pathname.startsWith(child.href + "/")
}

function hasActiveChild(pathname: string, item: NavItem): boolean {
  return (item.children ?? []).some((child) => isChildActive(pathname, child))
}

function isItemActive(pathname: string, item: NavItem): boolean {
  if (pathname === item.href) return true

  if (hasActiveChild(pathname, item)) return true

  if (pathname.startsWith(item.href + "/")) return true

  return false
}

export default function Sidebar({ companyName, userName, canPostLoads = false, canHaulLoads = false, role, permissions }: SidebarProps) {
  const pathname = usePathname() ?? ""
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())
  const displayCompanyName = companyName?.trim() || "MoveBoss Pro"
  const displayUserName = userName?.trim() || "Fleet Owner"
  const workspaceInitials = getInitials(displayCompanyName)
  const roleBadge = getRoleBadge(canPostLoads, canHaulLoads, role)

  // If no permissions object provided, assume full access (owner/operator or admin)
  const hasFullAccess = !permissions
  const canManageDrivers = hasFullAccess || permissions?.can_manage_drivers
  const canManageVehicles = hasFullAccess || permissions?.can_manage_vehicles
  const canManageTrips = hasFullAccess || permissions?.can_manage_trips
  const canManageLoads = hasFullAccess || permissions?.can_manage_loads
  const canViewFinancials = hasFullAccess || permissions?.can_view_financials

  // Build nav items based on capabilities
  const navItems = useMemo(() => {
    const items: NavItem[] = [
      { label: "Overview", href: "/dashboard", icon: LayoutDashboard },
      { label: "Activity", href: "/dashboard/activity", icon: Radio },
    ]

    // POSTING Section - only show when canPostLoads (is_broker = true)
    if (canPostLoads) {
      // Post Pickup - Brokers and Moving Companies
      items.push({
        label: "Post Pickup",
        href: "/dashboard/post-pickup",
        icon: Upload,
        section: "posting",
      })

      // Post Load - Moving Companies ONLY (is_broker AND is_carrier)
      // Brokers (is_broker only) don't see this - they never have freight
      if (canHaulLoads) {
        items.push({
          label: "Post Load",
          href: "/dashboard/post-load",
          icon: PackagePlus,
          section: "posting",
        })
      }

      // My Posted Jobs - Anyone who posts (brokers + moving companies)
      items.push({
        label: "My Posted Jobs",
        href: "/dashboard/posted-jobs",
        icon: FileText,
        section: "posting",
      })

      // Carrier Requests - Anyone who posts
      items.push({
        label: "Carrier Requests",
        href: "/dashboard/carrier-requests",
        icon: ClipboardCheck,
        section: "posting",
      })

      // Loads Given Out - Loads assigned to external carriers
      items.push({
        label: "Loads Given Out",
        href: "/dashboard/loads-given-out",
        icon: Send,
        section: "posting",
      })

      // Find Trucks - Browse available capacity from carriers
      items.push({
        label: "Find Trucks",
        href: "/dashboard/marketplace-capacity",
        icon: Package,
        section: "posting",
      })
    }

    // Carrier section - only show when canHaulLoads
    if (canHaulLoads) {
      // Build Operations children based on permissions
      const operationsChildren: NavItem[] = [
        { label: "Load Board", href: "/dashboard/load-board", icon: Search },
        { label: "My Requests", href: "/dashboard/my-requests", icon: Send },
      ]
      if (canManageLoads) {
        operationsChildren.push({ label: "My Loads", href: "/dashboard/loads", icon: Boxes })
        operationsChildren.push({ label: "Assigned Loads", href: "/dashboard/assigned-loads", icon: ClipboardCheck })
      }
      if (canManageTrips) {
        operationsChildren.push({ label: "Trips", href: "/dashboard/trips", icon: Route })
      }

      items.push({
        label: "Operations",
        href: "/dashboard/operations",
        icon: ClipboardList,
        section: "carrier",
        children: operationsChildren,
      })

      // Fleet - only show if user can manage vehicles
      if (canManageVehicles) {
        items.push({
          label: "Fleet",
          href: "/dashboard/fleet",
          icon: Truck,
          section: "carrier",
          children: [
            { label: "Trucks", href: "/dashboard/fleet/trucks", icon: Truck },
            { label: "Trailers", href: "/dashboard/fleet/trailers", icon: Boxes },
            { label: "Live Fleet", href: "/dashboard/fleet/live", icon: MapPin },
          ],
        })
      }

      // People - only show if user can manage drivers
      if (canManageDrivers) {
        items.push({
          label: "People",
          href: "/dashboard/people",
          icon: Users,
          section: "carrier",
          children: [
            { label: "Drivers", href: "/dashboard/people/drivers", icon: User },
            { label: "Crew & Helpers", href: "/dashboard/people/helpers", icon: UserCog },
          ],
        })
      }
    }

    // General section - always visible
    items.push({ label: "Storage", href: "/dashboard/storage", icon: Warehouse, section: "general" })
    items.push({ label: "Companies", href: "/dashboard/companies", icon: Building2, section: "general" })
    items.push({ label: "Partnerships", href: "/dashboard/partnerships", icon: Handshake, section: "general" })
    items.push({ label: "Compliance", href: "/dashboard/compliance", icon: FileCheck, section: "general" })

    // Finance - only show if user can view financials
    if (canViewFinancials) {
      items.push({
        label: "Finance",
        href: "/dashboard/finance",
        icon: Wallet,
        section: "general",
        children: [
          { label: "Settlements", href: "/dashboard/finance/settlements", icon: Receipt },
          { label: "Receivables", href: "/dashboard/finance/receivables", icon: Wallet },
          { label: "Expenses", href: "/dashboard/finance/expenses", icon: CreditCard },
          { label: "Reports", href: "/dashboard/finance/reports", icon: BarChart3 },
        ],
      })
    }
    items.push({ label: "Reports", href: "/dashboard/reports", icon: BarChart3, section: "general" })
    items.push({
      label: "Settings",
      href: "/dashboard/settings",
      icon: SettingsIcon,
      section: "general",
      children: [
        { label: "Account", href: "/dashboard/settings/account", icon: User },
        { label: "Company Profile", href: "/dashboard/settings/company-profile", icon: Building2 },
        { label: "Team", href: "/dashboard/settings/team", icon: Users },
        { label: "Roles & Permissions", href: "/dashboard/settings/roles", icon: ShieldCheck },
        { label: "Integrations", href: "/dashboard/settings/integrations", icon: Plug },
      ],
    })

    return items
  }, [canPostLoads, canHaulLoads, canManageDrivers, canManageVehicles, canManageTrips, canManageLoads, canViewFinancials])

  useEffect(() => {
    setExpandedItems((prev) => {
      const next = new Set(prev)
      navItems.forEach((item) => {
        if (item.children && isItemActive(pathname, item)) {
          next.add(item.href)
        }
      })
      return next
    })
  }, [pathname, navItems])

  const toggleExpanded = (href: string) => {
    setExpandedItems((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(href)) {
        newSet.delete(href)
      } else {
        newSet.add(href)
      }
      return newSet
    })
  }

  // Group items by section for visual separation
  const postingItems = navItems.filter((item) => item.section === "posting")
  const carrierItems = navItems.filter((item) => item.section === "carrier")
  const generalItems = navItems.filter((item) => item.section === "general")
  const topItems = navItems.filter((item) => !item.section)

  const renderNavItem = (item: NavItem) => {
    const Icon = item.icon
    const active = isItemActive(pathname, item)
    const hasChildren = item.children && item.children.length > 0
    const isExpanded = expandedItems.has(item.href)

    return (
      <div key={item.href} className="space-y-0.5">
        {hasChildren ? (
          <div className="flex items-center gap-0.5">
            <Button
              asChild
              variant="ghost"
              size="sm"
              className={cn(
                "flex-1 justify-start gap-2.5 h-8 text-[13px] font-medium transition-all duration-150",
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
              )}
            >
              <Link href={item.href}>
                <Icon className="h-4 w-4 shrink-0 opacity-70" />
                <span className="flex-1">{item.label}</span>
              </Link>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0 text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                toggleExpanded(item.href)
              }}
            >
              <ChevronRight
                className={cn(
                  "h-3.5 w-3.5 transition-transform duration-150",
                  isExpanded && "rotate-90"
                )}
              />
            </Button>
          </div>
        ) : (
          <Button
            asChild
            variant="ghost"
            size="sm"
            className={cn(
              "w-full justify-start gap-2.5 h-8 text-[13px] font-medium transition-all duration-150",
              active
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
            )}
          >
            <Link href={item.href}>
              <Icon className="h-4 w-4 shrink-0 opacity-70" />
              <span className="flex-1">{item.label}</span>
            </Link>
          </Button>
        )}

        {hasChildren && isExpanded && item.children && (
          <div className="ml-3.5 space-y-0.5 border-l border-sidebar-border pl-3 animate-in slide-in-from-top-1 duration-150">
            {item.children.map((child) => {
              const ChildIcon = child.icon
              const childActive = isChildActive(pathname, child)

              return (
                <Button
                  key={child.href}
                  asChild
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "w-full justify-start gap-2 text-xs font-normal transition-all duration-150 h-7",
                    childActive
                      ? "bg-sidebar-accent/80 text-sidebar-accent-foreground font-medium"
                      : "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/40"
                  )}
                >
                  <Link href={child.href}>
                    <ChildIcon className="h-3.5 w-3.5 shrink-0 opacity-60" />
                    <span>{child.label}</span>
                  </Link>
                </Button>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  return (
    <aside className="hidden border-r border-sidebar-border bg-sidebar md:flex md:w-60 md:flex-col">
      <div className="flex h-[60px] items-center border-b border-sidebar-border px-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-xs font-bold text-primary-foreground shadow-sm shrink-0">
            {workspaceInitials}
          </div>
          <div className="space-y-0 min-w-0">
            <p className="max-w-[145px] truncate text-sm font-semibold text-sidebar-foreground leading-tight">
              {displayCompanyName}
            </p>
            <p className="max-w-[145px] truncate text-[11px] text-sidebar-foreground/60">{roleBadge}</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-0.5 px-2.5 py-3 overflow-y-auto">
        {/* Top items (Overview, Activity) */}
        {topItems.map(renderNavItem)}

        {/* Posting Section */}
        {postingItems.length > 0 && (
          <>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/50 px-2 pt-5 pb-1">
              Posting
            </p>
            {postingItems.map(renderNavItem)}
          </>
        )}

        {/* Carrier Section */}
        {carrierItems.length > 0 && (
          <>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/50 px-2 pt-5 pb-1">
              Carrier
            </p>
            {carrierItems.map(renderNavItem)}
          </>
        )}

        {/* General Section */}
        {generalItems.length > 0 && (
          <>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/50 px-2 pt-5 pb-1">
              General
            </p>
            {generalItems.map(renderNavItem)}
          </>
        )}
      </nav>
    </aside>
  )
}
