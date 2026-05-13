import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as adminClient } from '@supabase/supabase-js'
import { ptoBalanceAdjustSchema } from '@/lib/validations/pto'
import { logAudit } from '@/lib/audit'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { data: adminRow } = await supabase
    .from('users')
    .select('role, is_active')
    .eq('id', user.id)
    .single()

  if (!adminRow || adminRow.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json().catch(() => null)
  const parsed = ptoBalanceAdjustSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 })
  }

  const { userId, adjustment, reason } = parsed.data
  const admin = adminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { data: target } = await admin
    .from('users')
    .select('pto_balance')
    .eq('id', userId)
    .single()

  if (!target) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const oldBalance = target.pto_balance
  const newBalance = Math.max(0, oldBalance + adjustment)

  await admin.from('users').update({ pto_balance: newBalance }).eq('id', userId)

  await logAudit({
    userId: user.id,
    action: 'pto_balance_adjusted',
    targetUserId: userId,
    tableName: 'users',
    oldValue: { pto_balance: oldBalance },
    newValue: { pto_balance: newBalance, reason },
  })

  return NextResponse.json({ newBalance })
}
