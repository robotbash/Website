import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as adminClient } from '@supabase/supabase-js'
import { createEmployeeSchema } from '@/lib/validations/admin'
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
  if (!user) return null

  const { data: userRow } = await supabase
    .from('users')
    .select('role, is_active')
    .eq('id', user.id)
    .single()

  if (!userRow || !userRow.is_active || userRow.role !== 'admin') return null
  return user
}

export async function GET() {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .order('full_name')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ users: data })
}

export async function POST(req: NextRequest) {
  const adminUser = await requireAdmin()
  if (!adminUser) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json().catch(() => null)
  const parsed = createEmployeeSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Invalid request' },
      { status: 400 }
    )
  }

  const { fullName, email, annualPtoHours, hireDate, role } = parsed.data
  const admin = getAdmin()
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

  // Create auth user and send invite
  const { data: authData, error: authError } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${appUrl}/setup`,
    data: { full_name: fullName },
  })

  if (authError) {
    return NextResponse.json({ error: authError.message }, { status: 400 })
  }

  // Insert into users table
  const { data: newUser, error: insertError } = await admin
    .from('users')
    .insert({
      id: authData.user.id,
      full_name: fullName,
      email,
      role,
      annual_pto_hours: annualPtoHours,
      pto_balance: annualPtoHours,
      hire_date: hireDate ?? null,
      force_password_reset: true,
      is_active: true,
    })
    .select()
    .single()

  if (insertError) {
    // Roll back auth user if profile creation fails
    await admin.auth.admin.deleteUser(authData.user.id)
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  await logAudit({
    userId: adminUser.id,
    action: 'user_created',
    targetUserId: newUser.id,
    tableName: 'users',
    newValue: { email, role, annual_pto_hours: annualPtoHours },
    ipAddress: getClientIP(req),
  })

  return NextResponse.json({ user: newUser }, { status: 201 })
}
