import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { createClient as createAdminSupabase } from '@supabase/supabase-js'
import { z } from 'zod'
import { getClientIP } from '@/lib/utils'

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  rememberMe: z.boolean().optional().default(false),
})

function adminClient() {
  return createAdminSupabase(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid email or password' }, { status: 400 })
  }

  const { email, password, rememberMe } = parsed.data
  const ip = getClientIP(req)
  const admin = adminClient()

  // Check rate limit (uses DB function)
  const { data: limitRows } = await admin.rpc('check_login_rate_limit', {
    p_email: email,
    p_ip: ip,
  })

  const limit = limitRows?.[0]
  if (limit?.is_locked) {
    await admin.rpc('record_login_attempt', { p_email: email, p_ip: ip, p_success: false })

    if (limit.lockout_reason === 'account_locked') {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      )
    }
    return NextResponse.json(
      { error: 'Invalid email or password' },
      { status: 401 }
    )
  }

  // Attempt sign-in
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (pairs) => {
          pairs.forEach(({ name, value, options }) => {
            if (rememberMe) {
              cookieStore.set(name, value, { ...options, maxAge: 60 * 60 * 24 * 30 })
            } else {
              // Session cookie — expires on browser close
              cookieStore.set(name, value, { ...options, maxAge: undefined })
            }
          })
        },
      },
    }
  )

  const { data, error } = await supabase.auth.signInWithPassword({ email, password })

  if (error || !data.user) {
    await admin.rpc('record_login_attempt', { p_email: email, p_ip: ip, p_success: false })
    return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
  }

  await admin.rpc('record_login_attempt', { p_email: email, p_ip: ip, p_success: true })

  // Check if user account is active
  const { data: userRow } = await admin
    .from('users')
    .select('is_active, force_password_reset')
    .eq('id', data.user.id)
    .single()

  if (!userRow?.is_active) {
    await supabase.auth.signOut()
    return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
  }

  return NextResponse.json({
    ok: true,
    forcePasswordReset: userRow.force_password_reset,
  })
}
