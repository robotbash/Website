import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as adminClient } from '@supabase/supabase-js'
import { updateEmployeeSchema } from '@/lib/validations/admin'
import { logAudit } from '@/lib/audit'
import { getClientIP } from '@/lib/utils'

function getAdmin() {
  return adminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { user: null, supabase }

  const { data: userRow } = await supabase
    .from('users')
    .select('role, is_active')
    .eq('id', user.id)
    .single()

  if (!userRow || !userRow.is_active || userRow.role !== 'admin') return { user: null, supabase }
  return { user, supabase }
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, supabase } = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', id)
    .single()

  if (error) return NextResponse.json({ error: 'User not found' }, { status: 404 })
  return NextResponse.json({ user: data })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user: adminUser, supabase } = await requireAdmin()
  if (!adminUser) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const body = await req.json().catch(() => null)
  const parsed = updateEmployeeSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 })
  }

  const { data: existing } = await supabase
    .from('users')
    .select('*')
    .eq('id', id)
    .single()

  if (!existing) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const updates: Record<string, unknown> = {}
  if (parsed.data.fullName !== undefined) updates.full_name = parsed.data.fullName
  if (parsed.data.email !== undefined) updates.email = parsed.data.email
  if (parsed.data.annualPtoHours !== undefined) updates.annual_pto_hours = parsed.data.annualPtoHours
  if (parsed.data.hireDate !== undefined) updates.hire_date = parsed.data.hireDate
  if (parsed.data.role !== undefined) updates.role = parsed.data.role
  if (parsed.data.isActive !== undefined) updates.is_active = parsed.data.isActive

  const admin = getAdmin()
  const { data: updated, error } = await admin
    .from('users')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const action = parsed.data.isActive === false ? 'user_deactivated'
    : parsed.data.isActive === true ? 'user_reactivated'
    : parsed.data.role !== undefined ? 'role_changed'
    : 'user_updated'

  await logAudit({
    userId: adminUser.id,
    action: action as never,
    targetUserId: id,
    tableName: 'users',
    oldValue: existing as never,
    newValue: updates as never,
    ipAddress: getClientIP(req),
  })

  return NextResponse.json({ user: updated })
}
