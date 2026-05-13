import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { EmployeeDetailClient } from '@/components/admin/employee-detail-client'
import { getYearBounds, calcWorkedHours, calcBreakMinutes } from '@/lib/utils'
import { format, subDays } from 'date-fns'
import type { TimeEntry, Break } from '@/lib/supabase/types'

export const metadata: Metadata = { title: 'Employee Detail' }
export const dynamic = 'force-dynamic'

export default async function EmployeeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: adminRow } = await supabase.from('users').select('role').eq('id', user.id).single()
  if (adminRow?.role !== 'admin') redirect('/')

  const { data: employee } = await supabase
    .from('users')
    .select('*')
    .eq('id', id)
    .single()

  if (!employee) notFound()

  // Last 30 days timesheet
  const thirtyDaysAgo = format(subDays(new Date(), 30), 'yyyy-MM-dd')
  const { data: timeEntries } = await supabase
    .from('time_entries')
    .select('*, breaks(*)')
    .eq('user_id', id)
    .gte('clock_in_at', `${thirtyDaysAgo}T00:00:00Z`)
    .order('clock_in_at', { ascending: false })

  // YTD PTO
  const { data: ptoEntries } = await supabase
    .from('pto_entries')
    .select('*')
    .eq('user_id', id)
    .order('start_date', { ascending: false })

  // YTD sick days
  const { start: yearStart } = getYearBounds()
  const { data: sickDays } = await supabase
    .from('sick_days')
    .select('*')
    .eq('user_id', id)
    .gte('date', format(yearStart, 'yyyy-MM-dd'))
    .order('date', { ascending: false })

  // Settings for break pay
  const { data: settingsRows } = await supabase.from('settings').select('*')
  const settings = Object.fromEntries((settingsRows ?? []).map((r) => [r.key, r.value]))
  const breaksPaid = (settings.breaks_paid_default as boolean) ?? false

  return (
    <EmployeeDetailClient
      employee={employee}
      timeEntries={(timeEntries ?? []) as Array<TimeEntry & { breaks: Break[] }>}
      ptoEntries={ptoEntries ?? []}
      sickDays={sickDays ?? []}
      breaksPaid={breaksPaid}
    />
  )
}
