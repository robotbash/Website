import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AdminPtoClient } from '@/components/admin/admin-pto-client'
import type { PtoEntry } from '@/lib/supabase/types'

export const metadata: Metadata = { title: 'Admin - PTO Requests' }
export const dynamic = 'force-dynamic'

export interface PtoEntryWithEmployee extends PtoEntry {
  employee: { full_name: string; email: string } | null
}

export interface PtoConflict {
  employeeName: string
  start_date: string
  end_date: string
  status: string
}

// Two inclusive date ranges overlap when each starts on or before the other ends.
function rangesOverlap(s1: string, e1: string, s2: string, e2: string): boolean {
  return s1 <= e2 && s2 <= e1
}

export default async function AdminPtoPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: adminRow } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (adminRow?.role !== 'admin') redirect('/')

  const { data: rawEntries } = await supabase
    .from('pto_entries')
    .select(`
      *,
      employee:users!pto_entries_user_id_fkey(full_name, email)
    `)
    .order('created_at', { ascending: false })

  const entries = (rawEntries ?? []) as PtoEntryWithEmployee[]

  // For each entry, find overlapping PTO from OTHER employees (pending or approved).
  // Denied requests never count as conflicts.
  const active = entries.filter((e) => e.status !== 'denied')
  const conflicts: Record<string, PtoConflict[]> = {}
  for (const e of entries) {
    if (e.status === 'denied') continue
    conflicts[e.id] = active
      .filter(
        (other) =>
          other.id !== e.id &&
          other.user_id !== e.user_id &&
          rangesOverlap(e.start_date, e.end_date, other.start_date, other.end_date)
      )
      .map((other) => ({
        employeeName: other.employee?.full_name ?? 'Unknown',
        start_date: other.start_date,
        end_date: other.end_date,
        status: other.status,
      }))
  }

  return (
    <div className="container max-w-4xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-1">PTO Requests</h1>
      <p className="text-muted-foreground mb-6">
        Review time-off requests. Overlapping requests from other employees are flagged as conflicts.
      </p>
      <AdminPtoClient entries={entries} conflicts={conflicts} />
    </div>
  )
}
