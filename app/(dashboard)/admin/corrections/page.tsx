import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AdminCorrectionsClient } from '@/components/admin/admin-corrections-client'

export const metadata: Metadata = { title: 'Admin - Corrections' }
export const dynamic = 'force-dynamic'

export default async function AdminCorrectionsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: adminRow } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (adminRow?.role !== 'admin') redirect('/')

  const { data: corrections } = await supabase
    .from('punch_corrections')
    .select(`
      *,
      employee:users!punch_corrections_user_id_fkey(full_name, email)
    `)
    .order('created_at', { ascending: false })

  return (
    <div className="container max-w-4xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-6">Punch Corrections</h1>
      <AdminCorrectionsClient corrections={corrections ?? []} />
    </div>
  )
}
