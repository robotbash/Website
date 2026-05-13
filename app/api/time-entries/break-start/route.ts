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

  // Check for already open break
  const { data: openBreak } = await supabase
    .from('breaks')
    .select('id')
    .eq('time_entry_id', entry.id)
    .is('end_at', null)
    .maybeSingle()

  if (openBreak) {
    return NextResponse.json({ error: 'Already on a break' }, { status: 409 })
  }

  // Determine if break is paid from global settings
  const { data: setting } = await supabase
    .from('settings')
    .select('value')
    .eq('key', 'breaks_paid_default')
    .single()
  const isPaid = (setting?.value as boolean) ?? false

  const { data: breakRow, error } = await supabase
    .from('breaks')
    .insert({ time_entry_id: entry.id, start_at: new Date().toISOString(), is_paid: isPaid })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: 'Failed to start break' }, { status: 500 })
  }

  await logAudit({
    userId: user.id,
    action: 'break_start',
    targetRecordId: breakRow.id,
    tableName: 'breaks',
    ipAddress: getClientIP(req),
  })

  return NextResponse.json({ break: breakRow })
}
