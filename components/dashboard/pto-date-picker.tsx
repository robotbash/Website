'use client'

import { useState } from 'react'
import { DayPicker, type DateRange } from 'react-day-picker'
import { format, isWeekend, eachDayOfInterval, parseISO } from 'date-fns'
import { CalendarIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Popover } from '@radix-ui/react-popover'
import { PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'

import 'react-day-picker/dist/style.css'

export function countBusinessDays(from: Date, to: Date): number {
  return eachDayOfInterval({ start: from, end: to }).filter((d) => !isWeekend(d)).length
}

interface PtoDatePickerProps {
  value: DateRange | undefined
  onChange: (range: DateRange | undefined) => void
}

export function PtoDatePicker({ value, onChange }: PtoDatePickerProps) {
  const [open, setOpen] = useState(false)

  const businessDays = value?.from && value?.to
    ? countBusinessDays(value.from, value.to)
    : value?.from
    ? (isWeekend(value.from) ? 0 : 1)
    : 0

  const label = value?.from
    ? value.to && value.to.getTime() !== value.from.getTime()
      ? `${format(value.from, 'MMM d')} – ${format(value.to, 'MMM d, yyyy')}`
      : format(value.from, 'MMM d, yyyy')
    : 'Select dates'

  return (
    <div className="space-y-1">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn('w-full justify-start text-left font-normal', !value?.from && 'text-muted-foreground')}
          >
            <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
            {label}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <DayPicker
            mode="range"
            selected={value}
            onSelect={(range) => {
              onChange(range)
              if (range?.from && range?.to) setOpen(false)
            }}
            disabled={[
              { dayOfWeek: [0, 6] },
              { before: new Date() },
            ]}
            numberOfMonths={2}
            showOutsideDays={false}
            styles={{
              selected: { backgroundColor: 'hsl(var(--primary))', color: 'hsl(var(--primary-foreground))' },
            }}
          />
        </PopoverContent>
      </Popover>

      {businessDays > 0 && (
        <p className="text-xs text-muted-foreground pl-1">
          {businessDays} business day{businessDays !== 1 ? 's' : ''} selected
          {value?.from && value?.to && value.from.getTime() !== value.to.getTime() &&
            ` (weekends excluded)`}
        </p>
      )}
    </div>
  )
}
