import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'

const schema = z.object({
  email: z.string().email(),
})

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)

  // Always return 200 to prevent email enumeration
  if (!parsed.success) {
    return NextResponse.json({ ok: true })
  }

  const { email } = parsed.data
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  // Fire-and-forget — do not leak whether the email exists
  admin.auth.admin.generateLink({
    type: 'recovery',
    email,
    options: { redirectTo: `${appUrl}/reset-password` },
  }).catch(() => {})

  return NextResponse.json({ ok: true })
}
