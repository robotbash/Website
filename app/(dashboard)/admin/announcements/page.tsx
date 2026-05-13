import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AnnouncementsClient } from '@/components/admin/announcements-client'

export const metadata: Metadata = { title: 'Announcements' }
export const dynamic = 'force-dynamic'

export default async function AnnouncementsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: adminRow } = await supabase.from('users').select('role').eq('id', user.id).single()
  if (adminRow?.role !== 'admin') redirect('/')

  const { data: announcements } = await supabase
    .from('announcements')
    .select('*')
    .order('created_at', { ascending: false })

  return (
    <div className="container max-w-3xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-6">Announcements</h1>
      <AnnouncementsClient announcements={announcements ?? []} />
    </div>
  )
}
