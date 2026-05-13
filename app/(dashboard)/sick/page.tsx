import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { SickDayForm } from '@/components/dashboard/sick-day-form'
import { formatDate } from '@/lib/utils'
import type { SickDay } from '@/lib/supabase/types'

export const metadata: Metadata = { title: 'Sick / Call-Off' }
export const dynamic = 'force-dynamic'

export default async function SickPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: entries } = await supabase
    .from('sick_days')
    .select('*')
    .eq('user_id', user.id)
    .order('date', { ascending: false })

  return (
    <div className="container max-w-2xl mx-auto px-4 py-6 space-y-6">
      <h1 className="text-2xl font-bold">Sick Day / Call-Off</h1>

      <SickDayForm />

      <div>
        <h2 className="text-lg font-semibold mb-3">History</h2>
        {(!entries || entries.length === 0) ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No entries yet.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {(entries as SickDay[]).map((e) => (
              <Card key={e.id}>
                <CardContent className="py-3">
                  <div className="flex justify-between items-center gap-2">
                    <div>
                      <p className="font-medium">{formatDate(e.date)}</p>
                      {e.note && <p className="text-sm text-muted-foreground">{e.note}</p>}
                    </div>
                    <Badge variant={e.type === 'sick' ? 'warning' : 'secondary'}>
                      {e.type === 'sick' ? 'Sick' : 'Call-Off'}
                    </Badge>
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
