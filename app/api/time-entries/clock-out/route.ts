import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logAudit } from '@/lib/audit'
import { getClientIP } from '@/lib/utils'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  // Find active entry
  const { data: entry } = await supabase
    .from('time_entries')
    .select('id, clock_in_at')
    .eq('user_id', user.id)
    .is('clock_out_at', null)
    .single()

  if (!entry) {
    return NextResponse.json({ error: 'Not clocked in' }, { status: 409 })
  }

  // Close any open break first
  const { data: openBreak } = await supabase
    .from('breaks')
    .select('id')
    .eq('time_entry_id', entry.id)
    .is('end_at', null)
    .single()

  const clockOutAt = new Date().toISOString()

  if (openBreak) {
    await supabase
      .from('breaks')
      .update({ end_at: clockOutAt })
      .eq('id', openBreak.id)
  }

  const { data: updated, error } = await supabase
    .from('time_entries')
    .update({ clock_out_at: clockOutAt })
    .eq('id', entry.id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: 'Failed to clock out' }, { status: 500 })
  }

  await logAudit({
    userId: user.id,
    action: 'clock_out',
    targetUserId: user.id,
    targetRecordId: entry.id,
    tableName: 'time_entries',
    oldValue: { clock_in_at: entry.clock_in_at, clock_out_at: null },
    newValue: { clock_out_at: clockOutAt },
    ipAddress: getClientIP(req),
    userAgent: req.headers.get('user-agent'),
  })

  return NextResponse.json({ entry: updated })
}
