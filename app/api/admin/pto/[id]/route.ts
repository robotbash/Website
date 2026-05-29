import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as adminClient } from '@supabase/supabase-js'
import { ptoReviewSchema } from '@/lib/validations/pto'
import { logAudit } from '@/lib/audit'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
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
    const parsed = ptoReviewSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 })
    }

    const { id } = await params
    const { status, adminNotes } = parsed.data

    const admin = adminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const { data: entry } = await admin
      .from('pto_entries')
      .select('*')
      .eq('id', id)
      .single()

    if (!entry) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (entry.status !== 'pending') {
      return NextResponse.json({ error: 'Already reviewed' }, { status: 409 })
    }

    // On approval, deduct the hours from the employee's balance now.
    // Re-check the live balance to guard against approving more than is available.
    if (status === 'approved') {
      const { data: target } = await admin
        .from('users')
        .select('pto_balance')
        .eq('id', entry.user_id)
        .single()

      if (!target) return NextResponse.json({ error: 'Employee not found' }, { status: 404 })

      if (target.pto_balance < entry.hours) {
        return NextResponse.json(
          { error: `Insufficient balance: employee has ${target.pto_balance.toFixed(1)}h, request needs ${entry.hours.toFixed(1)}h.` },
          { status: 422 }
        )
      }

      await admin
        .from('users')
        .update({ pto_balance: target.pto_balance - entry.hours })
        .eq('id', entry.user_id)
    }

    const { data: updated, error } = await admin
      .from('pto_entries')
      .update({
        status,
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
        admin_notes: adminNotes ?? null,
      })
      .eq('id', id)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    await logAudit({
      userId: user.id,
      action: status === 'approved' ? 'pto_approved' : 'pto_denied',
      targetUserId: entry.user_id,
      targetRecordId: id,
      tableName: 'pto_entries',
      oldValue: { status: 'pending' },
      newValue: { status, hours: entry.hours, admin_notes: adminNotes ?? null },
      ipAddress: req.headers.get('x-forwarded-for')?.split(',')[0] ?? null,
    })

    return NextResponse.json({ entry: updated })
  } catch (err) {
    console.error('[pto review route] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
