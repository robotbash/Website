import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Navbar } from '@/components/layout/navbar'
import type { User } from '@/lib/supabase/types'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()

  if (!authUser) {
    redirect('/login')
  }

  const { data: userRow } = await supabase
    .from('users')
    .select('*')
    .eq('id', authUser.id)
    .single()

  if (!userRow || !userRow.is_active) {
    redirect('/login')
  }

  // If first login, force password setup
  if (userRow.force_password_reset) {
    redirect('/setup?first=1')
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar user={userRow as User} />
      <main className="pt-14 pb-safe">
        {children}
      </main>
    </div>
  )
}
