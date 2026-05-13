import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { AccountSettingsForm } from '@/components/dashboard/account-settings-form'

export const metadata: Metadata = { title: 'Account Settings' }
export const dynamic = 'force-dynamic'

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: userRow } = await supabase
    .from('users')
    .select('full_name, email')
    .eq('id', user.id)
    .single()

  return (
    <div className="container max-w-2xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-6">Account Settings</h1>
      <AccountSettingsForm fullName={userRow?.full_name ?? ''} email={userRow?.email ?? ''} />
    </div>
  )
}
