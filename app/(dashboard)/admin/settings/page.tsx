import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AdminSettingsClient } from '@/components/admin/admin-settings-client'

export const metadata: Metadata = { title: 'Admin Settings' }
export const dynamic = 'force-dynamic'

export default async function AdminSettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: adminRow } = await supabase.from('users').select('role').eq('id', user.id).single()
  if (adminRow?.role !== 'admin') redirect('/')

  const { data: rows } = await supabase.from('settings').select('*')
  const settings = Object.fromEntries((rows ?? []).map((r) => [r.key, r.value]))

  return (
    <div className="container max-w-2xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-6">App Settings</h1>
      <AdminSettingsClient settings={settings as Record<string, unknown>} />
    </div>
  )
}
