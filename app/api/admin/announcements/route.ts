import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as adminClient } from '@supabase/supabase-js'
import { announcementSchema } from '@/lib/validations/admin'
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

  const { data, error } = await supabase
    .from('announcements')
    .select(`*, announcement_dismissals(user_id)`)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ announcements: data })
}

export async function POST(req: NextRequest) {
  const adminUser = await requireAdmin()
  if (!adminUser) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json().catch(() => null)
  const parsed = announcementSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 })
  }

  const admin = adminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { data, error } = await admin
    .from('announcements')
    .insert({
      title: parsed.data.title,
      body: parsed.data.body,
      expires_at: parsed.data.expiresAt ?? null,
      created_by: adminUser.id,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await logAudit({ userId: adminUser.id, action: 'announcement_created', targetRecordId: data.id, tableName: 'announcements', newValue: { title: data.title } as never })
  return NextResponse.json({ announcement: data }, { status: 201 })
}
