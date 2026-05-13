import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as adminClient } from '@supabase/supabase-js'
import { settingsSchema } from '@/lib/validations/admin'
import { logAudit } from '@/lib/audit'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: row } = await supabase.from('users').select('role, is_active').eq('id', user.id).single()
  if (!row || !row.is_active || row.role !== 'admin') return null
  return user
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { data, error } = await supabase.from('settings').select('*')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const settings = Object.fromEntries(data.map((row) => [row.key, row.value]))
  return NextResponse.json({ settings })
}

export async function PATCH(req: NextRequest) {
  const adminUser = await requireAdmin()
  if (!adminUser) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json().catch(() => null)
  const parsed = settingsSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 })
  }

  const admin = adminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const updates = Object.entries(parsed.data).filter(([, v]) => v !== undefined)
  const upserts = updates.map(([key, value]) => ({
    key,
    value: JSON.stringify(value),
    updated_by: adminUser.id,
    updated_at: new Date().toISOString(),
  }))

  const { error } = await admin.from('settings').upsert(upserts)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await logAudit({
    userId: adminUser.id,
    action: 'settings_updated',
    tableName: 'settings',
    newValue: parsed.data as never,
  })

  return NextResponse.json({ ok: true })
}
