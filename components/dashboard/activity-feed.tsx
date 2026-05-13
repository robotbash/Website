'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDateTime, formatHours, calcWorkedHours, calcBreakMinutes } from '@/lib/utils'
import type { TimeEntry, Break } from '@/lib/supabase/types'

interface ActivityFeedProps {
  entries: Array<TimeEntry & { breaks: Break[] }>
  breaksPaid: boolean
}

export function ActivityFeed({ entries, breaksPaid }: ActivityFeedProps) {
  if (entries.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            You have not clocked in yet today. Tap the big button above to start.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {entries.map((entry) => {
            const breakMins = calcBreakMinutes(entry.breaks)
            const worked = entry.clock_out_at
              ? calcWorkedHours(entry.clock_in_at, entry.clock_out_at, breakMins, breaksPaid)
              : null

            return (
              <div key={entry.id} className="flex items-start justify-between gap-2 text-sm">
                <div>
                  <p className="font-medium">{formatDateTime(entry.clock_in_at)}</p>
                  <p className="text-muted-foreground">
                    {entry.clock_out_at
                      ? `to ${formatDateTime(entry.clock_out_at)}`
                      : 'Still clocked in'}
                    {breakMins > 0 && ` · ${Math.round(breakMins)}m break`}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  {worked !== null ? (
                    <span className="font-medium">{formatHours(worked)}</span>
                  ) : (
                    <Badge variant="success">Active</Badge>
                  )}
                  {entry.was_corrected && (
                    <p className="text-xs text-muted-foreground">corrected</p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

export function ActivityFeedSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <Skeleton className="h-5 w-32" />
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex justify-between">
              <div className="space-y-1">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-32" />
              </div>
              <Skeleton className="h-4 w-12" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
