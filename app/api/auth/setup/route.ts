import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as adminClient } from '@supabase/supabase-js'
import { passwordSchema } from '@/lib/validations/auth'
import { logAudit } from '@/lib/audit'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const body = await req.json().catch(() => null)
  const parsed = passwordSchema.safeParse(body?.password)

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Invalid password' },
      { status: 400 }
    )
  }

  const { error } = await supabase.auth.updateUser({ password: parsed.data })
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  // Clear force_password_reset flag
  const admin = adminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
  await admin.from('users').update({ force_password_reset: false }).eq('id', user.id)

  await logAudit({
    userId: user.id,
    action: 'password_reset_sent',
    targetUserId: user.id,
    ipAddress: req.headers.get('x-forwarded-for')?.split(',')[0] ?? null,
  })

  return NextResponse.json({ ok: true })
}
