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

  // Check if already clocked in
  const { data: existing } = await supabase
    .from('time_entries')
    .select('id')
    .eq('user_id', user.id)
    .is('clock_out_at', null)
    .single()

  if (existing) {
    return NextResponse.json({ error: 'Already clocked in' }, { status: 409 })
  }

  // Use server timestamp — never trust client
  const { data: entry, error } = await supabase
    .from('time_entries')
    .insert({ user_id: user.id, clock_in_at: new Date().toISOString() })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: 'Failed to clock in' }, { status: 500 })
  }

  await logAudit({
    userId: user.id,
    action: 'clock_in',
    targetUserId: user.id,
    targetRecordId: entry.id,
    tableName: 'time_entries',
    newValue: { clock_in_at: entry.clock_in_at },
    ipAddress: getClientIP(req),
    userAgent: req.headers.get('user-agent'),
  })

  return NextResponse.json({ entry })
}
