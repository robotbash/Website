import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatDateTime, formatHours, calcWorkedHours, calcBreakMinutes } from '@/lib/utils'
import { subDays, format } from 'date-fns'
import type { TimeEntry, Break } from '@/lib/supabase/types'

export const metadata: Metadata = { title: 'My Timesheet' }
export const dynamic = 'force-dynamic'

export default async function TimesheetPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const twoWeeksAgo = format(subDays(new Date(), 14), 'yyyy-MM-dd')

  const { data: entries } = await supabase
    .from('time_entries')
    .select('*, breaks(*)')
    .eq('user_id', user.id)
    .gte('clock_in_at', `${twoWeeksAgo}T00:00:00Z`)
    .order('clock_in_at', { ascending: false })

  const { data: settingsRows } = await supabase.from('settings').select('*')
  const settings = Object.fromEntries((settingsRows ?? []).map((r) => [r.key, r.value]))
  const breaksPaid = (settings.breaks_paid_default as boolean) ?? false

  return (
    <div className="container max-w-3xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-6">My Timesheet</h1>
      <p className="text-sm text-muted-foreground mb-4">Showing the last 14 days.</p>

      {(!entries || entries.length === 0) ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No time entries in the last 14 days.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {(entries as Array<TimeEntry & { breaks: Break[] }>).map((entry) => {
            const breakMins = calcBreakMinutes(entry.breaks)
            const worked = entry.clock_out_at
              ? calcWorkedHours(entry.clock_in_at, entry.clock_out_at, breakMins, breaksPaid)
              : null

            return (
              <Card key={entry.id}>
                <CardContent className="py-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium">{formatDateTime(entry.clock_in_at)}</p>
                        {entry.was_corrected && (
                          <Badge variant="secondary">Corrected</Badge>
                        )}
                        {!entry.clock_out_at && (
                          <Badge variant="success">Active</Badge>
                        )}
                      </div>
                      {entry.clock_out_at && (
                        <p className="text-sm text-muted-foreground">
                          to {formatDateTime(entry.clock_out_at)}
                        </p>
                      )}
                      {breakMins > 0 && (
                        <p className="text-sm text-muted-foreground">
                          Break: {Math.round(breakMins)} min
                        </p>
                      )}
                    </div>
                    {worked !== null && (
                      <div className="text-right shrink-0">
                        <p className="text-xl font-bold">{formatHours(worked)}</p>
                        <p className="text-xs text-muted-foreground">worked</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
