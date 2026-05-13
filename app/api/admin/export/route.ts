import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { exportSchema } from '@/lib/validations/admin'
import { format, parseISO } from 'date-fns'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { adminUser: null, supabase }
  const { data: row } = await supabase.from('users').select('role, is_active').eq('id', user.id).single()
  if (!row || !row.is_active || row.role !== 'admin') return { adminUser: null, supabase }
  return { adminUser: user, supabase }
}

function toCSV(headers: string[], rows: string[][]): string {
  const escape = (v: string) => `"${v.replace(/"/g, '""')}"`
  return [
    headers.map(escape).join(','),
    ...rows.map((r) => r.map(escape).join(',')),
  ].join('\n')
}

export async function GET(req: NextRequest) {
  const { adminUser, supabase } = await requireAdmin()
  if (!adminUser) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const url = new URL(req.url)
  const parsed = exportSchema.safeParse({
    type: url.searchParams.get('type'),
    startDate: url.searchParams.get('startDate'),
    endDate: url.searchParams.get('endDate'),
    employeeIds: url.searchParams.get('employeeIds')
      ? url.searchParams.get('employeeIds')!.split(',')
      : undefined,
  })

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 })
  }

  const { type, startDate, endDate, employeeIds } = parsed.data
  let csvContent = ''

  if (type === 'timesheets') {
    let query = supabase
      .from('time_entries')
      .select(`*, users(full_name, email), breaks(start_at, end_at, is_paid)`)
      .gte('clock_in_at', `${startDate}T00:00:00Z`)
      .lte('clock_in_at', `${endDate}T23:59:59Z`)
      .order('clock_in_at')

    if (employeeIds?.length) {
      query = query.in('user_id', employeeIds)
    }

    const { data } = await query
    const headers = ['Employee', 'Email', 'Date', 'Clock In', 'Clock Out', 'Break Minutes', 'Worked Hours', 'Was Corrected']
    const rows = (data ?? []).map((e: Record<string, unknown>) => {
      const user = e.users as { full_name: string; email: string } | null
      const breaks = (e.breaks as Array<{ start_at: string; end_at: string | null; is_paid: boolean }>) ?? []
      const breakMins = breaks.reduce((acc, b) => {
        if (!b.end_at) return acc
        return acc + Math.round((new Date(b.end_at).getTime() - new Date(b.start_at).getTime()) / 60000)
      }, 0)
      const clockIn = e.clock_in_at as string
      const clockOut = e.clock_out_at as string | null
      const workedMs = clockOut
        ? new Date(clockOut).getTime() - new Date(clockIn).getTime() - breakMins * 60000
        : 0
      const workedHrs = (workedMs / 3600000).toFixed(2)
      return [
        user?.full_name ?? '',
        user?.email ?? '',
        format(parseISO(clockIn), 'yyyy-MM-dd'),
        format(parseISO(clockIn), 'HH:mm'),
        clockOut ? format(parseISO(clockOut), 'HH:mm') : '',
        String(breakMins),
        workedHrs,
        (e.was_corrected as boolean) ? 'Yes' : 'No',
      ]
    })
    csvContent = toCSV(headers, rows)
  } else if (type === 'pto') {
    let query = supabase
      .from('pto_entries')
      .select(`*, users(full_name, email)`)
      .gte('start_date', startDate)
      .lte('end_date', endDate)
      .order('start_date')

    if (employeeIds?.length) query = query.in('user_id', employeeIds)

    const { data } = await query
    const headers = ['Employee', 'Email', 'Start Date', 'End Date', 'Hours', 'Note']
    const rows = (data ?? []).map((e: Record<string, unknown>) => {
      const user = e.users as { full_name: string; email: string } | null
      return [user?.full_name ?? '', user?.email ?? '', e.start_date as string, e.end_date as string, String(e.hours), (e.note as string) ?? '']
    })
    csvContent = toCSV(headers, rows)
  } else {
    const sickType = type === 'sick_days' ? 'sick' : 'call_off'
    let query = supabase
      .from('sick_days')
      .select(`*, users(full_name, email)`)
      .eq('type', sickType)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date')

    if (employeeIds?.length) query = query.in('user_id', employeeIds)

    const { data } = await query
    const headers = ['Employee', 'Email', 'Date', 'Type', 'Note']
    const rows = (data ?? []).map((e: Record<string, unknown>) => {
      const user = e.users as { full_name: string; email: string } | null
      return [user?.full_name ?? '', user?.email ?? '', e.date as string, e.type as string, (e.note as string) ?? '']
    })
    csvContent = toCSV(headers, rows)
  }

  const filename = `${type}_${startDate}_to_${endDate}.csv`
  return new NextResponse(csvContent, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
