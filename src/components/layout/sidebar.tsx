"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  Building2,
  Package,
  ClipboardList,
  Users,
  Truck,
  Boxes,
  Store,
  Bell,
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
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type NavItem = {
  label: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  children?: NavItem[]
}

type SidebarProps = {
  companyName?: string | null
  userName?: string | null
}

const navItems: NavItem[] = [
  { label: "Overview", href: "/dashboard", icon: LayoutDashboard },
  { label: "Activity", href: "/dashboard/activity", icon: Radio },
  {
    label: "Operations",
    href: "/dashboard/operations",
    icon: ClipboardList,
    children: [
      { label: "Marketplace", href: "/dashboard/marketplace", icon: Store },
      { label: "Loads", href: "/dashboard/loads", icon: Package },
      { label: "Trips", href: "/dashboard/trips", icon: Route },
      { label: "Alerts", href: "/dashboard/alerts", icon: Bell },
    ],
  },
  {
    label: "Fleet",
    href: "/dashboard/fleet",
    icon: Warehouse,
    children: [
      { label: "Trucks", href: "/dashboard/fleet/trucks", icon: Truck },
      { label: "Trailers", href: "/dashboard/fleet/trailers", icon: Boxes },
      { label: "Live Fleet", href: "/dashboard/fleet/live", icon: MapPin },
    ],
  },
  {
    label: "People",
    href: "/dashboard/people",
    icon: Users,
    children: [
      { label: "Drivers", href: "/dashboard/people/drivers", icon: User },
      { label: "Crew & Helpers", href: "/dashboard/people/helpers", icon: UserCog },
    ],
  },
  { label: "Companies", href: "/dashboard/companies", icon: Building2 },
  {
    label: "Finance",
    href: "/dashboard/finance",
    icon: Wallet,
    children: [
      { label: "Settlements", href: "/dashboard/finance/settlements", icon: Receipt },
      { label: "Receivables", href: "/dashboard/finance/receivables", icon: Wallet },
      { label: "Expenses", href: "/dashboard/finance/expenses", icon: CreditCard },
      { label: "Reports", href: "/dashboard/finance/reports", icon: BarChart3 },
    ],
  },
  { label: "Reports", href: "/dashboard/reports", icon: BarChart3 },
  {
    label: "Settings",
    href: "/dashboard/settings",
    icon: SettingsIcon,
    children: [
      { label: "Account", href: "/dashboard/settings/account", icon: User },
      { label: "Company Profile", href: "/dashboard/settings/company", icon: Building2 },
      { label: "Roles & Permissions", href: "/dashboard/settings/roles", icon: ShieldCheck },
      { label: "Integrations", href: "/dashboard/settings/integrations", icon: Plug },
    ],
  },
]

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

export default function Sidebar({ companyName, userName }: SidebarProps) {
  const pathname = usePathname() ?? ""
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())
  const displayCompanyName = companyName?.trim() || "MoveBoss Pro"
  const displayUserName = userName?.trim() || "Fleet Owner"
  const workspaceInitials = getInitials(displayCompanyName)
  
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
  }, [pathname])

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

  return (
    <aside className="hidden border-r border-border bg-card md:flex md:w-64 md:flex-col">
      <div className="flex h-24 items-center border-b border-border px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
            {workspaceInitials}
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-muted-foreground">
              Workspace
            </p>
            <p className="max-w-[150px] truncate text-sm font-semibold text-foreground">
              {displayCompanyName}
            </p>
            <p className="max-w-[150px] truncate text-xs text-muted-foreground">{displayUserName}</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {navItems.map((item) => {
          const Icon = item.icon
          const active = isItemActive(pathname, item)
          const hasChildren = item.children && item.children.length > 0
          const isExpanded = expandedItems.has(item.href)

          return (
            <div key={item.href} className="space-y-1">
              {hasChildren ? (
                <div className="flex items-center gap-1">
                  <Button
                    asChild
                    variant="ghost"
                    className={cn(
                      "flex-1 justify-start gap-3 text-sm font-medium transition-all duration-200",
                      active
                        ? "bg-accent text-accent-foreground hover:bg-accent/90 shadow-sm"
                        : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                    )}
                  >
                    <Link href={item.href}>
                      <Icon className="h-4 w-4 shrink-0" />
                      <span className="flex-1">{item.label}</span>
                    </Link>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      toggleExpanded(item.href)
                    }}
                  >
                    <ChevronRight
                      className={cn(
                        "h-4 w-4 transition-transform duration-200",
                        isExpanded && "rotate-90"
                      )}
                    />
                  </Button>
                </div>
              ) : (
                <Button
                  asChild
                  variant="ghost"
                  className={cn(
                    "w-full justify-start gap-3 text-sm font-medium transition-all duration-200",
                    active
                      ? "bg-accent text-accent-foreground hover:bg-accent/90 shadow-sm"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                  )}
                >
                  <Link href={item.href}>
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="flex-1">{item.label}</span>
                  </Link>
                </Button>
              )}

              {hasChildren && isExpanded && item.children && (
                <div className="ml-4 space-y-0.5 border-l-2 border-border/30 pl-4 animate-in slide-in-from-top-1 duration-200">
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
                          "w-full justify-start gap-2.5 text-xs font-normal transition-all duration-200 h-8",
                          childActive
                            ? "bg-accent/80 text-accent-foreground hover:bg-accent shadow-sm font-medium"
                            : "text-muted-foreground hover:text-foreground hover:bg-accent/30"
                        )}
                      >
                        <Link href={child.href}>
                          <ChildIcon className="h-3.5 w-3.5 shrink-0" />
                          <span>{child.label}</span>
                        </Link>
                      </Button>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </nav>
    </aside>
  )
}
