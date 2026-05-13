import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { correctionSchema } from '@/lib/validations/time-entries'
import { logAudit } from '@/lib/audit'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { data, error } = await supabase
    .from('punch_corrections')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ corrections: data })
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const body = await req.json().catch(() => null)
  const parsed = correctionSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Invalid request' },
      { status: 400 }
    )
  }

  const { requestedClockIn, requestedClockOut, reason, originalEntryId } = parsed.data

  const { data: correction, error } = await supabase
    .from('punch_corrections')
    .insert({
      user_id: user.id,
      requested_clock_in: requestedClockIn,
      requested_clock_out: requestedClockOut ?? null,
      reason,
      original_entry_id: originalEntryId ?? null,
      status: 'pending',
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await logAudit({
    userId: user.id,
    action: 'correction_submitted',
    targetUserId: user.id,
    targetRecordId: correction.id,
    tableName: 'punch_corrections',
    newValue: { requested_clock_in: requestedClockIn, reason },
  })

  return NextResponse.json({ correction })
}
