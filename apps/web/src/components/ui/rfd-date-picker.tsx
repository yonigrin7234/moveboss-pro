"use client"

import * as React from "react"
import { format, addDays } from "date-fns"
import { CalendarIcon, Clock } from "lucide-react"

import { cn } from "@/lib/utils"
import { Calendar } from "@/components/ui/calendar"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { calculateDeliveryDeadline, formatDateForDB } from "@/lib/business-days"
import { calculateRFDUrgency, getUrgencyBadgeLabel } from "@/lib/rfd-urgency"

interface RFDDatePickerProps {
  /** Name prefix for form fields */
  name?: string
  /** Default RFD date (YYYY-MM-DD format) */
  defaultRfdDate?: string
  /** Default TBD state */
  defaultTbd?: boolean
  /** Default days to deliver */
  defaultDaysToDeliver?: number
  /** Default business days toggle */
  defaultUseBusinessDays?: boolean
  /** Callback when values change */
  onChange?: (values: {
    rfdDate: string | null
    isTbd: boolean
    daysToDeliver: number | null
    useBusinessDays: boolean
    deliveryDeadline: string | null
  }) => void
  /** Whether the field is required */
  required?: boolean
  /** Error message to display */
  error?: string
  /** Show compact layout */
  compact?: boolean
  /** className */
  className?: string
}

const DAYS_PRESETS = [
  { value: "7", label: "7 days" },
  { value: "14", label: "14 days" },
  { value: "21", label: "21 days" },
  { value: "30", label: "30 days" },
  { value: "custom", label: "Custom" },
]

export function RFDDatePicker({
  name = "rfd",
  defaultRfdDate,
  defaultTbd = false,
  defaultDaysToDeliver,
  defaultUseBusinessDays = true,
  onChange,
  required = false,
  error,
  compact = false,
  className,
}: RFDDatePickerProps) {
  const [date, setDate] = React.useState<Date | undefined>(
    defaultRfdDate ? new Date(defaultRfdDate + 'T00:00:00') : undefined
  )
  const [isTbd, setIsTbd] = React.useState(defaultTbd)
  const [daysToDeliver, setDaysToDeliver] = React.useState<number | null>(
    defaultDaysToDeliver ?? null
  )
  const [daysPreset, setDaysPreset] = React.useState<string>(
    defaultDaysToDeliver
      ? DAYS_PRESETS.find(p => p.value === String(defaultDaysToDeliver))
        ? String(defaultDaysToDeliver)
        : "custom"
      : ""
  )
  const [customDays, setCustomDays] = React.useState<string>(
    defaultDaysToDeliver && !DAYS_PRESETS.find(p => p.value === String(defaultDaysToDeliver))
      ? String(defaultDaysToDeliver)
      : ""
  )
  const [useBusinessDays, setUseBusinessDays] = React.useState(defaultUseBusinessDays)
  const [dateOpen, setDateOpen] = React.useState(false)

  // Calculate delivery deadline
  const deliveryDeadline = React.useMemo(() => {
    if (!date || isTbd || !daysToDeliver) return null
    return calculateDeliveryDeadline(date, daysToDeliver, useBusinessDays)
  }, [date, isTbd, daysToDeliver, useBusinessDays])

  // Calculate urgency for visual indicator
  const urgency = React.useMemo(() => {
    if (isTbd || !date) {
      return calculateRFDUrgency({ rfd_date: null, rfd_date_tbd: isTbd })
    }
    return calculateRFDUrgency({
      rfd_date: format(date, "yyyy-MM-dd"),
      rfd_date_tbd: false,
    })
  }, [date, isTbd])

  // Sync state when defaults change
  React.useEffect(() => {
    if (defaultRfdDate) {
      setDate(new Date(defaultRfdDate + 'T00:00:00'))
    }
  }, [defaultRfdDate])

  React.useEffect(() => {
    setIsTbd(defaultTbd)
  }, [defaultTbd])

  // Notify parent of changes
  React.useEffect(() => {
    if (onChange) {
      onChange({
        rfdDate: date && !isTbd ? format(date, "yyyy-MM-dd") : null,
        isTbd,
        daysToDeliver,
        useBusinessDays,
        deliveryDeadline: deliveryDeadline ? formatDateForDB(deliveryDeadline) : null,
      })
    }
  }, [date, isTbd, daysToDeliver, useBusinessDays, deliveryDeadline, onChange])

  // Handle TBD toggle
  const handleTbdChange = (checked: boolean) => {
    setIsTbd(checked)
    if (checked) {
      setDate(undefined)
    }
  }

  // Handle days preset change
  const handleDaysPresetChange = (value: string) => {
    setDaysPreset(value)
    if (value === "custom") {
      // Keep existing custom value if any
      if (customDays) {
        setDaysToDeliver(parseInt(customDays, 10))
      } else {
        setDaysToDeliver(null)
      }
    } else {
      setDaysToDeliver(parseInt(value, 10))
      setCustomDays("")
    }
  }

  // Handle custom days input
  const handleCustomDaysChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setCustomDays(value)
    const numValue = parseInt(value, 10)
    if (!isNaN(numValue) && numValue > 0 && numValue <= 365) {
      setDaysToDeliver(numValue)
    } else if (value === "") {
      setDaysToDeliver(null)
    }
  }

  // Format date for form submission
  const formattedDate = date && !isTbd ? format(date, "yyyy-MM-dd") : ""
  const formattedDeadline = deliveryDeadline ? formatDateForDB(deliveryDeadline) : ""

  // Year range for calendar
  const currentYear = new Date().getFullYear()
  const startMonth = new Date(currentYear - 1, 0)
  const endMonth = new Date(currentYear + 2, 11)

  return (
    <div className={cn("space-y-4", className)}>
      {/* Hidden form inputs */}
      <input type="hidden" name={`${name}_date`} value={formattedDate} />
      <input type="hidden" name={`${name}_date_tbd`} value={isTbd ? "true" : "false"} />
      <input type="hidden" name={`${name}_days_to_deliver`} value={daysToDeliver ?? ""} />
      <input type="hidden" name={`${name}_use_business_days`} value={useBusinessDays ? "true" : "false"} />
      <input type="hidden" name={`${name}_delivery_deadline`} value={formattedDeadline} />

      {/* Main RFD Date Row */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
        {/* Date Picker */}
        <div className="flex-1">
          <Popover open={dateOpen} onOpenChange={setDateOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                disabled={isTbd}
                className={cn(
                  "flex h-10 w-full items-center rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                  !date && "text-muted-foreground",
                  isTbd && "opacity-50 cursor-not-allowed",
                  error && "border-destructive"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                <span className="truncate">
                  {isTbd
                    ? "TBD - Date not set"
                    : date
                    ? format(date, "MMM d, yyyy")
                    : "Select RFD date"}
                </span>
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={date}
                onSelect={(newDate) => {
                  setDate(newDate)
                  setDateOpen(false)
                }}
                captionLayout="dropdown"
                startMonth={startMonth}
                endMonth={endMonth}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* TBD Checkbox */}
        <div className="flex items-center gap-2">
          <Checkbox
            id={`${name}-tbd`}
            checked={isTbd}
            onCheckedChange={handleTbdChange}
          />
          <Label htmlFor={`${name}-tbd`} className="text-sm font-normal cursor-pointer">
            TBD
          </Label>
        </div>

        {/* Urgency Badge */}
        {!compact && (
          <Badge
            variant={urgency.badgeVariant}
            className={cn("shrink-0", urgency.colorClass)}
          >
            {getUrgencyBadgeLabel(urgency)}
          </Badge>
        )}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {/* Days to Deliver Row (only show if date is set and not TBD) */}
      {!isTbd && date && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4 pt-2 border-t">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>Days to deliver:</span>
          </div>

          {/* Days Preset Select */}
          <Select value={daysPreset} onValueChange={handleDaysPresetChange}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Select days" />
            </SelectTrigger>
            <SelectContent>
              {DAYS_PRESETS.map((preset) => (
                <SelectItem key={preset.value} value={preset.value}>
                  {preset.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Custom Days Input */}
          {daysPreset === "custom" && (
            <Input
              type="number"
              min={1}
              max={365}
              placeholder="Days"
              value={customDays}
              onChange={handleCustomDaysChange}
              className="w-20"
            />
          )}

          {/* Business Days Toggle */}
          <div className="flex items-center gap-2">
            <Switch
              id={`${name}-business-days`}
              checked={useBusinessDays}
              onCheckedChange={setUseBusinessDays}
            />
            <Label htmlFor={`${name}-business-days`} className="text-sm font-normal cursor-pointer">
              Business days
            </Label>
          </div>
        </div>
      )}

      {/* Calculated Deadline Display */}
      {!isTbd && date && daysToDeliver && deliveryDeadline && (
        <div className="flex items-center gap-2 text-sm bg-muted/50 rounded-md px-3 py-2">
          <CalendarIcon className="h-4 w-4 text-muted-foreground" />
          <span className="text-muted-foreground">Delivery deadline:</span>
          <span className="font-medium">{format(deliveryDeadline, "MMM d, yyyy")}</span>
          <span className="text-muted-foreground">
            ({useBusinessDays ? "business" : "calendar"} days)
          </span>
        </div>
      )}
    </div>
  )
}
