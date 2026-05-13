import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AuditLogClient } from '@/components/admin/audit-log-client'

export const metadata: Metadata = { title: 'Audit Log' }
export const dynamic = 'force-dynamic'

export default async function AuditLogPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: adminRow } = await supabase.from('users').select('role').eq('id', user.id).single()
  if (adminRow?.role !== 'admin') redirect('/')

  const { data: logs } = await supabase
    .from('audit_log')
    .select(`
      *,
      actor:users!audit_log_user_id_fkey(full_name),
      target:users!audit_log_target_user_id_fkey(full_name)
    `)
    .order('created_at', { ascending: false })
    .limit(200)

  return (
    <div className="container max-w-5xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-2">Audit Log</h1>
      <p className="text-sm text-muted-foreground mb-6">Read-only record of all sensitive actions.</p>
      <AuditLogClient logs={logs ?? []} />
    </div>
  )
}
