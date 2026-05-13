import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { HolidaysClient } from '@/components/admin/holidays-client'

export const metadata: Metadata = { title: 'Holidays' }
export const dynamic = 'force-dynamic'

export default async function HolidaysPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: adminRow } = await supabase.from('users').select('role').eq('id', user.id).single()
  if (adminRow?.role !== 'admin') redirect('/')

  const { data: holidays } = await supabase
    .from('holidays')
    .select('*')
    .order('date')

  return (
    <div className="container max-w-3xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-6">Company Holidays</h1>
      <HolidaysClient holidays={holidays ?? []} />
    </div>
  )
}
