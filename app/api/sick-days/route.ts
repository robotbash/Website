import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sickDaySchema } from '@/lib/validations/pto'
import { logAudit } from '@/lib/audit'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { data, error } = await supabase
    .from('sick_days')
    .select('*')
    .eq('user_id', user.id)
    .order('date', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ entries: data })
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const body = await req.json().catch(() => null)
  const parsed = sickDaySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Invalid request' },
      { status: 400 }
    )
  }

  const { date, type, note } = parsed.data

  const { data: entry, error } = await supabase
    .from('sick_days')
    .insert({
      user_id: user.id,
      date,
      type,
      note: note ?? null,
      logged_by_user_id: user.id,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await logAudit({
    userId: user.id,
    action: 'sick_day_logged',
    targetUserId: user.id,
    targetRecordId: entry.id,
    tableName: 'sick_days',
    newValue: { date, type },
  })

  return NextResponse.json({ entry })
}
