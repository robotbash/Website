'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { formatHours } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface HoursWidgetProps {
  todayHours: number
  weekHours: number
  overtimeThreshold: number
  overtimeWarning: number
}

export function HoursWidget({ todayHours, weekHours, overtimeThreshold, overtimeWarning }: HoursWidgetProps) {
  const pct = Math.min(100, (weekHours / overtimeThreshold) * 100)

  const statusColor = weekHours >= overtimeThreshold
    ? 'text-orange-600 dark:text-orange-400'
    : weekHours >= overtimeWarning
    ? 'text-yellow-600 dark:text-yellow-400'
    : 'text-foreground'

  const progressColor = weekHours >= overtimeThreshold
    ? '[&>div]:bg-orange-500'
    : weekHours >= overtimeWarning
    ? '[&>div]:bg-yellow-500'
    : ''

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Hours This Week</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-end justify-between mb-2">
          <span className={cn('text-3xl font-bold tabular-nums', statusColor)}>
            {formatHours(weekHours)}
          </span>
          <span className="text-sm text-muted-foreground">
            of {overtimeThreshold}h
          </span>
        </div>
        <Progress value={pct} className={cn('h-3', progressColor)} />
        {weekHours >= overtimeWarning && (
          <p className={cn('text-xs mt-1.5', weekHours >= overtimeThreshold ? 'text-orange-600 dark:text-orange-400' : 'text-yellow-600 dark:text-yellow-400')}>
            {weekHours >= overtimeThreshold
              ? `Overtime — ${formatHours(weekHours - overtimeThreshold)} over the ${overtimeThreshold}h limit`
              : `${formatHours(overtimeThreshold - weekHours)} until overtime`}
          </p>
        )}
        <p className="text-sm text-muted-foreground mt-2">
          Today: <span className="font-medium text-foreground">{formatHours(todayHours)}</span>
        </p>
      </CardContent>
    </Card>
  )
}
