import { createClient } from '@/lib/supabase/server'
import { ClockWidget } from '@/components/dashboard/clock-widget'
import { HoursWidget } from '@/components/dashboard/hours-widget'
import { PtoWidget } from '@/components/dashboard/pto-widget'
import { ActivityFeed } from '@/components/dashboard/activity-feed'
import { AnnouncementsBanner } from '@/components/dashboard/announcements-banner'
import { QuickActions } from '@/components/dashboard/quick-actions'
import { SickCountWidget } from '@/components/dashboard/sick-count-widget'
import { getWeekBounds, getYearBounds, calcWorkedHours, calcBreakMinutes } from '@/lib/utils'
import { format } from 'date-fns'
import type { TimeEntry, Break, SickDay } from '@/lib/supabase/types'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) return null

  const { data: userRow } = await supabase
    .from('users')
    .select('*')
    .eq('id', authUser.id)
    .single()

  if (!userRow) return null

  // Get active time entry
  const { data: activeEntry } = await supabase
    .from('time_entries')
    .select('*, breaks(*)')
    .eq('user_id', authUser.id)
    .is('clock_out_at', null)
    .maybeSingle()

  // Get today's entries
  const today = format(new Date(), 'yyyy-MM-dd')
  const { data: todayEntries } = await supabase
    .from('time_entries')
    .select('*, breaks(*)')
    .eq('user_id', authUser.id)
    .gte('clock_in_at', `${today}T00:00:00Z`)
    .lte('clock_in_at', `${today}T23:59:59Z`)

  // Get this week's entries
  const { start: weekStart } = getWeekBounds()
  const { data: weekEntries } = await supabase
    .from('time_entries')
    .select('*, breaks(*)')
    .eq('user_id', authUser.id)
    .gte('clock_in_at', weekStart.toISOString())
    .not('clock_out_at', 'is', null)

  // Get settings for break pay
  const { data: settingsRows } = await supabase.from('settings').select('*')
  const settings = Object.fromEntries((settingsRows ?? []).map((r) => [r.key, r.value]))
  const breaksPaid = (settings.breaks_paid_default as boolean) ?? false
  const overtimeThreshold = (settings.overtime_threshold as number) ?? 40
  const overtimeWarning = (settings.overtime_warning as number) ?? 35

  // Calculate week hours (completed entries only)
  const weekHours = (weekEntries ?? []).reduce((acc, e: TimeEntry & { breaks: Break[] }) => {
    const bMins = calcBreakMinutes(e.breaks)
    return acc + calcWorkedHours(e.clock_in_at, e.clock_out_at, bMins, breaksPaid)
  }, 0)

  // Calculate today hours
  const todayHours = (todayEntries ?? []).reduce((acc, e: TimeEntry & { breaks: Break[] }) => {
    const bMins = calcBreakMinutes(e.breaks)
    return acc + calcWorkedHours(e.clock_in_at, e.clock_out_at, bMins, breaksPaid)
  }, 0)

  // Get active break if any
  const activeBreak = activeEntry
    ? (activeEntry.breaks as Break[]).find((b) => !b.end_at) ?? null
    : null

  // Recent activity (last 5 entries)
  const { data: recentEntries } = await supabase
    .from('time_entries')
    .select('*, breaks(*)')
    .eq('user_id', authUser.id)
    .order('clock_in_at', { ascending: false })
    .limit(5)

  // YTD sick days and call-offs
  const { start: yearStart } = getYearBounds()
  const { data: sickDays } = await supabase
    .from('sick_days')
    .select('*')
    .eq('user_id', authUser.id)
    .gte('date', format(yearStart, 'yyyy-MM-dd'))

  const sickCount = (sickDays ?? []).filter((s: SickDay) => s.type === 'sick').length
  const callOffCount = (sickDays ?? []).filter((s: SickDay) => s.type === 'call_off').length

  // Active announcements not yet dismissed
  const { data: announcements } = await supabase
    .from('announcements')
    .select(`*, announcement_dismissals!inner(user_id)`)
    .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)

  const { data: allAnnouncements } = await supabase
    .from('announcements')
    .select('*')
    .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)

  const { data: dismissals } = await supabase
    .from('announcement_dismissals')
    .select('announcement_id')
    .eq('user_id', authUser.id)

  const dismissedIds = new Set((dismissals ?? []).map((d) => d.announcement_id))
  const activeAnnouncements = (allAnnouncements ?? []).filter((a) => !dismissedIds.has(a.id))

  // Holiday for today
  const { data: todayHoliday } = await supabase
    .from('holidays')
    .select('*')
    .eq('date', today)
    .maybeSingle()

  // PTO rollover notice
  const showRolloverNotice = [10, 11].includes(new Date().getMonth())
  const { data: rolloverSetting } = await supabase
    .from('settings')
    .select('value')
    .eq('key', 'pto_rollover_policy')
    .single()
  const rolloverPolicy = (rolloverSetting?.value as string) ?? 'reset'
  const { data: rolloverCap } = await supabase
    .from('settings')
    .select('value')
    .eq('key', 'pto_rollover_cap_hours')
    .single()
  const capHours = (rolloverCap?.value as number) ?? 40

  return (
    <div className="container max-w-3xl mx-auto px-4 py-6 space-y-4">
      {/* Announcements */}
      {activeAnnouncements.length > 0 && (
        <AnnouncementsBanner announcements={activeAnnouncements} />
      )}

      {/* Holiday notice */}
      {todayHoliday && (
        <div className="rounded-lg bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 px-4 py-3 text-sm text-blue-800 dark:text-blue-200">
          Today is a company holiday: <strong>{todayHoliday.name}</strong>
          {todayHoliday.is_paid ? ' (paid)' : ' (unpaid)'}
        </div>
      )}

      {/* PTO rollover notice */}
      {showRolloverNotice && userRow.pto_balance > 0 && (
        <div className="rounded-lg bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 px-4 py-3 text-sm text-yellow-800 dark:text-yellow-200">
          <strong>Year-end PTO notice:</strong> You have {userRow.pto_balance.toFixed(1)} hours remaining.{' '}
          {rolloverPolicy === 'reset'
            ? 'Unused hours reset to zero at year end.'
            : rolloverPolicy === 'carryover'
            ? 'All unused hours carry over to next year.'
            : `Up to ${capHours} hours carry over; the rest are forfeited.`}
        </div>
      )}

      {/* Clock widget — the main feature */}
      <ClockWidget
        activeEntry={activeEntry ? {
          id: activeEntry.id,
          clock_in_at: activeEntry.clock_in_at,
          is_on_break: !!activeBreak,
          break_start_at: activeBreak?.start_at ?? null,
        } : null}
        userName={userRow.full_name}
      />

      {/* Hours progress */}
      <HoursWidget
        todayHours={todayHours}
        weekHours={weekHours}
        overtimeThreshold={overtimeThreshold}
        overtimeWarning={overtimeWarning}
      />

      {/* PTO balance */}
      <PtoWidget
        balance={userRow.pto_balance}
        annualHours={userRow.annual_pto_hours}
      />

      {/* Sick / call-off counts */}
      <SickCountWidget sickCount={sickCount} callOffCount={callOffCount} />

      {/* Quick actions */}
      <QuickActions />

      {/* Recent activity */}
      <ActivityFeed
        entries={(recentEntries ?? []) as Array<TimeEntry & { breaks: Break[] }>}
        breaksPaid={breaksPaid}
      />
    </div>
  )
}
