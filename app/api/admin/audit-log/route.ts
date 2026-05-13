import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { data: adminRow } = await supabase
    .from('users')
    .select('role, is_active')
    .eq('id', user.id)
    .single()

  if (!adminRow || adminRow.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const url = new URL(req.url)
  const targetUserId = url.searchParams.get('userId')
  const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '100'), 500)
  const offset = parseInt(url.searchParams.get('offset') ?? '0')

  let query = supabase
    .from('audit_log')
    .select(`
      *,
      actor:users!audit_log_user_id_fkey(full_name),
      target:users!audit_log_target_user_id_fkey(full_name)
    `)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (targetUserId) {
    query = query.or(`user_id.eq.${targetUserId},target_user_id.eq.${targetUserId}`)
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ logs: data })
}
