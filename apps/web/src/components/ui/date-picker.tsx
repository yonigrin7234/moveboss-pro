"use client"

import * as React from "react"
import { format } from "date-fns"
import { CalendarIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface DatePickerProps {
  name: string
  defaultValue?: string
  placeholder?: string
  className?: string
  onChange?: (value: string) => void
}

export function DatePicker({ name, defaultValue, placeholder = "Pick a date", className, onChange }: DatePickerProps) {
  const [date, setDate] = React.useState<Date | undefined>(
    defaultValue ? new Date(defaultValue + 'T00:00:00') : undefined
  )
  const [open, setOpen] = React.useState(false)

  // Format date as YYYY-MM-DD for form submission
  const formattedValue = date ? format(date, "yyyy-MM-dd") : ""

  // Year range for dropdown (100 years back to 10 years forward)
  const currentYear = new Date().getFullYear()
  const startMonth = new Date(currentYear - 100, 0)
  const endMonth = new Date(currentYear + 10, 11)

  return (
    <>
      <input type="hidden" name={name} value={formattedValue} />
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={cn(
              "flex w-full items-center rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              !date && "text-muted-foreground",
              className
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <span className="truncate">{date ? format(date, "MMM d, yyyy") : placeholder}</span>
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={date}
            onSelect={(newDate) => {
              setDate(newDate)
              setOpen(false)
              if (onChange) {
                onChange(newDate ? format(newDate, "yyyy-MM-dd") : "")
              }
            }}
            captionLayout="dropdown"
            startMonth={startMonth}
            endMonth={endMonth}
            initialFocus
          />
        </PopoverContent>
      </Popover>
    </>
  )
}
