"use client"

import * as React from "react"
import { format } from "date-fns"
import { CalendarIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
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
          <Button
            type="button"
            variant="outline"
            className={cn(
              "w-full justify-start text-left font-normal",
              !date && "text-muted-foreground",
              className
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date ? format(date, "MMM d, yyyy") : <span>{placeholder}</span>}
          </Button>
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
