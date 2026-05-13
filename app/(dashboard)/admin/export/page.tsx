import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ExportClient } from '@/components/admin/export-client'

export const metadata: Metadata = { title: 'Export Data' }
export const dynamic = 'force-dynamic'

export default async function ExportPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: adminRow } = await supabase.from('users').select('role').eq('id', user.id).single()
  if (adminRow?.role !== 'admin') redirect('/')

  const { data: employees } = await supabase.from('users').select('id, full_name').eq('is_active', true).order('full_name')
  const { data: presets } = await supabase.from('export_presets').select('*').order('name')

  return (
    <div className="container max-w-3xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-6">Export Data</h1>
      <ExportClient employees={employees ?? []} presets={presets ?? []} />
    </div>
  )
}
