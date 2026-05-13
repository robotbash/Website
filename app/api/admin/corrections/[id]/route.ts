import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as adminClient } from '@supabase/supabase-js'
import { adminCorrectionReviewSchema } from '@/lib/validations/time-entries'
import { logAudit } from '@/lib/audit'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { data: adminRow } = await supabase
    .from('users')
    .select('role, is_active')
    .eq('id', user.id)
    .single()

  if (!adminRow || !adminRow.is_active || adminRow.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json().catch(() => null)
  const parsed = adminCorrectionReviewSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 })
  }

  const { id } = await params
  const { status, adminNotes, requestedClockIn, requestedClockOut } = parsed.data

  const admin = adminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { data: correction } = await admin
    .from('punch_corrections')
    .select('*')
    .eq('id', id)
    .single()

  if (!correction) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (correction.status !== 'pending') {
    return NextResponse.json({ error: 'Already reviewed' }, { status: 409 })
  }

  const finalClockIn = requestedClockIn ?? correction.requested_clock_in
  const finalClockOut = requestedClockOut !== undefined ? requestedClockOut : correction.requested_clock_out

  const { data: updated, error } = await admin
    .from('punch_corrections')
    .update({
      status,
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
      admin_notes: adminNotes ?? null,
      requested_clock_in: finalClockIn,
      requested_clock_out: finalClockOut,
    })
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // If approved, create or update the time entry
  if (status === 'approved') {
    if (correction.original_entry_id) {
      await admin
        .from('time_entries')
        .update({
          clock_in_at: finalClockIn,
          clock_out_at: finalClockOut,
          was_corrected: true,
        })
        .eq('id', correction.original_entry_id)
    } else {
      await admin
        .from('time_entries')
        .insert({
          user_id: correction.user_id,
          clock_in_at: finalClockIn,
          clock_out_at: finalClockOut,
          was_corrected: true,
        })
    }
  }

  await logAudit({
    userId: user.id,
    action: status === 'approved' ? 'correction_approved' : 'correction_denied',
    targetUserId: correction.user_id,
    targetRecordId: id,
    tableName: 'punch_corrections',
    oldValue: { status: 'pending' },
    newValue: { status, admin_notes: adminNotes },
  })

  return NextResponse.json({ correction: updated })
}
