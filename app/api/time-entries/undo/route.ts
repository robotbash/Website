import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { logAudit } from '@/lib/audit'

const schema = z.object({
  type: z.enum(['clock_in', 'clock_out']),
  entryId: z.string().uuid(),
})

// 10-second undo window
const UNDO_WINDOW_SECONDS = 10

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const { type, entryId } = parsed.data

  const { data: entry } = await supabase
    .from('time_entries')
    .select('id, user_id, clock_in_at, clock_out_at')
    .eq('id', entryId)
    .eq('user_id', user.id)
    .single()

  if (!entry) {
    return NextResponse.json({ error: 'Entry not found' }, { status: 404 })
  }

  const now = Date.now()

  if (type === 'clock_in') {
    const elapsed = (now - new Date(entry.clock_in_at).getTime()) / 1000
    if (elapsed > UNDO_WINDOW_SECONDS) {
      return NextResponse.json({ error: 'Undo window expired' }, { status: 409 })
    }
    if (entry.clock_out_at !== null) {
      return NextResponse.json({ error: 'Cannot undo — already clocked out' }, { status: 409 })
    }

    // Delete the entire entry
    await supabase.from('time_entries').delete().eq('id', entryId)
    await logAudit({ userId: user.id, action: 'punch_undo', targetRecordId: entryId, newValue: { type: 'clock_in' } })
    return NextResponse.json({ ok: true })
  }

  // Undo clock-out
  if (!entry.clock_out_at) {
    return NextResponse.json({ error: 'Not clocked out' }, { status: 409 })
  }
  const elapsed = (now - new Date(entry.clock_out_at).getTime()) / 1000
  if (elapsed > UNDO_WINDOW_SECONDS) {
    return NextResponse.json({ error: 'Undo window expired' }, { status: 409 })
  }

  await supabase.from('time_entries').update({ clock_out_at: null }).eq('id', entryId)
  await logAudit({ userId: user.id, action: 'punch_undo', targetRecordId: entryId, newValue: { type: 'clock_out' } })
  return NextResponse.json({ ok: true })
}
