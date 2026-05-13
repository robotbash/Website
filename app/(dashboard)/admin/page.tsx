import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AdminDashboardClient } from '@/components/admin/admin-dashboard-client'
import { getWeekBounds, getYearBounds, calcWorkedHours, calcBreakMinutes } from '@/lib/utils'
import { format } from 'date-fns'
import type { TimeEntry, Break, SickDay } from '@/lib/supabase/types'

export const metadata: Metadata = { title: 'Admin Dashboard' }
export const dynamic = 'force-dynamic'

export default async function AdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: adminRow } = await supabase
    .from('users')
    .select('role, is_active')
    .eq('id', user.id)
    .single()

  if (!adminRow || adminRow.role !== 'admin') redirect('/')

  // Get all active employees
  const { data: employees } = await supabase
    .from('users')
    .select('*')
    .order('full_name')

  // Get all active time entries (for clocked-in status)
  const { data: activeEntries } = await supabase
    .from('time_entries')
    .select('user_id')
    .is('clock_out_at', null)

  const clockedInIds = new Set((activeEntries ?? []).map((e) => e.user_id))

  // Get week entries for all employees
  const { start: weekStart } = getWeekBounds()
  const { data: weekEntries } = await supabase
    .from('time_entries')
    .select('user_id, clock_in_at, clock_out_at, breaks(*)')
    .gte('clock_in_at', weekStart.toISOString())
    .not('clock_out_at', 'is', null)

  const { data: settingsRows } = await supabase.from('settings').select('*')
  const settings = Object.fromEntries((settingsRows ?? []).map((r) => [r.key, r.value]))
  const breaksPaid = (settings.breaks_paid_default as boolean) ?? false
  const overtimeThreshold = (settings.overtime_threshold as number) ?? 40
  const overtimeWarning = (settings.overtime_warning as number) ?? 35

  // Hours per employee this week
  const weekHoursMap: Record<string, number> = {}
  for (const entry of (weekEntries ?? []) as Array<TimeEntry & { breaks: Break[] }>) {
    const bMins = calcBreakMinutes(entry.breaks)
    const hrs = calcWorkedHours(entry.clock_in_at, entry.clock_out_at, bMins, breaksPaid)
    weekHoursMap[entry.user_id] = (weekHoursMap[entry.user_id] ?? 0) + hrs
  }

  // YTD sick/call-off counts
  const { start: yearStart } = getYearBounds()
  const { data: sickDays } = await supabase
    .from('sick_days')
    .select('user_id, type')
    .gte('date', format(yearStart, 'yyyy-MM-dd'))

  const sickMap: Record<string, { sick: number; callOff: number }> = {}
  for (const s of (sickDays ?? []) as Pick<SickDay, 'user_id' | 'type'>[]) {
    if (!sickMap[s.user_id]) sickMap[s.user_id] = { sick: 0, callOff: 0 }
    if (s.type === 'sick') sickMap[s.user_id].sick++
    else sickMap[s.user_id].callOff++
  }

  // Pending corrections count
  const { count: pendingCorrections } = await supabase
    .from('punch_corrections')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pending')

  const employeesWithStats = (employees ?? []).map((emp) => ({
    ...emp,
    clocked_in: clockedInIds.has(emp.id),
    week_hours: weekHoursMap[emp.id] ?? 0,
    sick_ytd: sickMap[emp.id]?.sick ?? 0,
    call_off_ytd: sickMap[emp.id]?.callOff ?? 0,
  }))

  return (
    <AdminDashboardClient
      employees={employeesWithStats}
      pendingCorrections={pendingCorrections ?? 0}
      overtimeThreshold={overtimeThreshold}
      overtimeWarning={overtimeWarning}
    />
  )
}
