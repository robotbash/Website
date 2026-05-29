import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as adminClient } from '@supabase/supabase-js'
import { adminPtoSchema } from '@/lib/validations/pto'
import { logAudit } from '@/lib/audit'
import { eachDayOfInterval, isWeekend, parseISO } from 'date-fns'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { adminUser: null }

  const { data: row } = await supabase
    .from('users')
    .select('role, is_active')
    .eq('id', user.id)
    .single()

  if (!row || !row.is_active || row.role !== 'admin') return { adminUser: null }
  return { adminUser: user }
}

export async function POST(req: NextRequest) {
  const { adminUser } = await requireAdmin()
  if (!adminUser) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json().catch(() => null)
  const parsed = adminPtoSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 })
  }

  const { userId, startDate, endDate, hoursPerDay, note } = parsed.data
  // Count business days only — keeps this consistent with the employee request route.
  const businessDays = eachDayOfInterval({ start: parseISO(startDate), end: parseISO(endDate) })
    .filter((d) => !isWeekend(d)).length
  const totalHours = businessDays * hoursPerDay

  const admin = adminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { data: targetUser } = await admin
    .from('users')
    .select('pto_balance')
    .eq('id', userId)
    .single()

  if (!targetUser) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  // Admin-created PTO is auto-approved and deducted immediately.
  const { data: entry, error } = await admin
    .from('pto_entries')
    .insert({
      user_id: userId,
      start_date: startDate,
      end_date: endDate,
      hours: totalHours,
      note: note ?? null,
      logged_by_user_id: adminUser.id,
      status: 'approved',
      reviewed_by: adminUser.id,
      reviewed_at: new Date().toISOString(),
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const newBalance = Math.max(0, targetUser.pto_balance - totalHours)
  await admin.from('users').update({ pto_balance: newBalance }).eq('id', userId)

  await logAudit({
    userId: adminUser.id,
    action: 'pto_requested',
    targetUserId: userId,
    targetRecordId: entry.id,
    tableName: 'pto_entries',
    newValue: { start_date: startDate, end_date: endDate, hours: totalHours, logged_by: adminUser.id },
  })

  return NextResponse.json({ entry })
}
