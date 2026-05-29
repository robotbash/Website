import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { ptoRequestSchema } from '@/lib/validations/pto'
import { logAudit } from '@/lib/audit'
import { eachDayOfInterval, isWeekend, parseISO } from 'date-fns'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { data, error } = await supabase
    .from('pto_entries')
    .select('*')
    .eq('user_id', user.id)
    .order('start_date', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ entries: data })
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const body = await req.json().catch(() => null)
  const parsed = ptoRequestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Invalid request' },
      { status: 400 }
    )
  }

  const { startDate, endDate, hoursPerDay, note } = parsed.data

  // Count only business days (server-side, so client can't manipulate this)
  const businessDays = eachDayOfInterval({ start: parseISO(startDate), end: parseISO(endDate) })
    .filter((d) => !isWeekend(d)).length
  const totalHours = businessDays * hoursPerDay

  // Check balance
  const { data: userRow } = await supabase
    .from('users')
    .select('pto_balance')
    .eq('id', user.id)
    .single()

  if (!userRow) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  if (userRow.pto_balance < totalHours) {
    return NextResponse.json(
      { error: `Not enough PTO balance. You have ${userRow.pto_balance.toFixed(1)} hours remaining.` },
      { status: 422 }
    )
  }

  // Create the request as PENDING. The balance is NOT deducted here —
  // a manager must approve the request first (see the admin PTO route).
  // RLS additionally enforces that employees can only insert pending rows.
  const { data: entry, error } = await supabase
    .from('pto_entries')
    .insert({
      user_id: user.id,
      start_date: startDate,
      end_date: endDate,
      hours: totalHours,
      note: note ?? null,
      logged_by_user_id: user.id,
      status: 'pending',
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await logAudit({
    userId: user.id,
    action: 'pto_requested',
    targetUserId: user.id,
    targetRecordId: entry.id,
    tableName: 'pto_entries',
    newValue: { start_date: startDate, end_date: endDate, hours: totalHours, status: 'pending' },
    ipAddress: req.headers.get('x-forwarded-for')?.split(',')[0] ?? null,
  })

  return NextResponse.json({ entry })
}
