"use client"

import Link from "next/link"
import { cn } from "@/lib/utils"

export type FMCSAStatus = 'verified' | 'inactive' | 'unverified' | 'issue'

export interface FMCSAVerificationBadgeProps {
  fmcsaVerified?: boolean | null
  fmcsaAllowedToOperate?: boolean | null
  fmcsaCommonAuthority?: string | null
  fmcsaLastChecked?: string | null
  className?: string
}

function getFMCSAStatus(props: FMCSAVerificationBadgeProps): FMCSAStatus {
  const { fmcsaVerified, fmcsaAllowedToOperate, fmcsaCommonAuthority, fmcsaLastChecked } = props

  if (!fmcsaLastChecked) {
    return 'unverified'
  }

  if (fmcsaVerified && fmcsaAllowedToOperate && fmcsaCommonAuthority === 'A') {
    return 'verified'
  }

  if (fmcsaVerified && (!fmcsaAllowedToOperate || fmcsaCommonAuthority !== 'A')) {
    return 'inactive'
  }

  if (fmcsaLastChecked && !fmcsaVerified) {
    return 'issue'
  }

  return 'unverified'
}

const statusConfig: Record<FMCSAStatus, {
  label: string
  icon: string
  className: string
}> = {
  verified: {
    label: 'FMCSA Verified',
    icon: '✓',
    className: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
  },
  inactive: {
    label: 'Authority Inactive',
    icon: '⚠',
    className: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
  },
  unverified: {
    label: 'Not Verified',
    icon: '○',
    className: 'bg-muted text-muted-foreground border-border'
  },
  issue: {
    label: 'Verification Issue',
    icon: '✕',
    className: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20'
  }
}

export function FMCSAVerificationBadge(props: FMCSAVerificationBadgeProps) {
  const status = getFMCSAStatus(props)
  const config = statusConfig[status]

  return (
    <Link
      href="/dashboard/settings/company-profile"
      className={cn(
        "inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-medium transition-colors hover:opacity-80",
        config.className,
        props.className
      )}
      title={`${config.label} - Click to manage`}
    >
      <span className="leading-none">{config.icon}</span>
      <span className="leading-none">{config.label}</span>
    </Link>
  )
}
