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

  const { data: entry } = await supabase
    .from('time_entries')
    .select('id')
    .eq('user_id', user.id)
    .is('clock_out_at', null)
    .single()

  if (!entry) {
    return NextResponse.json({ error: 'Not clocked in' }, { status: 409 })
  }

  const { data: openBreak } = await supabase
    .from('breaks')
    .select('id')
    .eq('time_entry_id', entry.id)
    .is('end_at', null)
    .single()

  if (!openBreak) {
    return NextResponse.json({ error: 'Not on a break' }, { status: 409 })
  }

  const { data: updated, error } = await supabase
    .from('breaks')
    .update({ end_at: new Date().toISOString() })
    .eq('id', openBreak.id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: 'Failed to end break' }, { status: 500 })
  }

  await logAudit({
    userId: user.id,
    action: 'break_end',
    targetRecordId: openBreak.id,
    tableName: 'breaks',
    ipAddress: getClientIP(req),
  })

  return NextResponse.json({ break: updated })
}
