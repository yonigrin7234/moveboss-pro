import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground",
        destructive:
          "border-transparent bg-destructive/10 text-destructive border-destructive/20",
        outline:
          "text-foreground border-border",
        // Premium status variants with subtle backgrounds
        success:
          "border-transparent bg-success/10 text-success border-success/20",
        warning:
          "border-transparent bg-warning/15 text-warning-foreground border-warning/25",
        info:
          "border-transparent bg-info/10 text-info border-info/20",
        // Muted variants for less emphasis
        muted:
          "border-transparent bg-muted text-muted-foreground",
        // Pill variants (fully rounded)
        pill:
          "rounded-full border-transparent bg-primary/10 text-primary",
        "pill-success":
          "rounded-full border-transparent bg-success/10 text-success",
        "pill-warning":
          "rounded-full border-transparent bg-warning/15 text-warning-foreground",
        "pill-destructive":
          "rounded-full border-transparent bg-destructive/10 text-destructive",
        "pill-info":
          "rounded-full border-transparent bg-info/10 text-info",
        // Solid status variants
        "solid-success":
          "border-transparent bg-success text-success-foreground",
        "solid-warning":
          "border-transparent bg-warning text-warning-foreground",
        "solid-info":
          "border-transparent bg-info text-info-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
