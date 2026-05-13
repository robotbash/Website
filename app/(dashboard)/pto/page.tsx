import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent } from '@/components/ui/card'
import { PtoRequestForm } from '@/components/dashboard/pto-request-form'
import { formatDate, formatHours } from '@/lib/utils'
import type { PtoEntry } from '@/lib/supabase/types'

export const metadata: Metadata = { title: 'PTO' }
export const dynamic = 'force-dynamic'

export default async function PtoPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: userRow } = await supabase
    .from('users')
    .select('pto_balance, annual_pto_hours')
    .eq('id', user.id)
    .single()

  const { data: entries } = await supabase
    .from('pto_entries')
    .select('*')
    .eq('user_id', user.id)
    .order('start_date', { ascending: false })

  const balance = userRow?.pto_balance ?? 0
  const annualHours = userRow?.annual_pto_hours ?? 0

  return (
    <div className="container max-w-2xl mx-auto px-4 py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">PTO</h1>
        <p className="text-muted-foreground">
          Balance: <strong>{formatHours(balance)}</strong> of {formatHours(annualHours)} remaining
        </p>
      </div>

      <PtoRequestForm balance={balance} />

      <div>
        <h2 className="text-lg font-semibold mb-3">PTO History</h2>
        {(!entries || entries.length === 0) ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No PTO requests yet.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {(entries as PtoEntry[]).map((e) => (
              <Card key={e.id}>
                <CardContent className="py-3">
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <p className="font-medium">{formatDate(e.start_date)} — {formatDate(e.end_date)}</p>
                      {e.note && <p className="text-sm text-muted-foreground">{e.note}</p>}
                    </div>
                    <p className="font-semibold shrink-0">{formatHours(e.hours)}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
