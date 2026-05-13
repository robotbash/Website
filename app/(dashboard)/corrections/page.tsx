import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CorrectionForm } from '@/components/dashboard/correction-form'
import { formatDateTime } from '@/lib/utils'
import type { PunchCorrection } from '@/lib/supabase/types'

export const metadata: Metadata = { title: 'Punch Corrections' }
export const dynamic = 'force-dynamic'

const statusVariant = {
  pending: 'warning' as const,
  approved: 'success' as const,
  denied: 'destructive' as const,
}

export default async function CorrectionsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: corrections } = await supabase
    .from('punch_corrections')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  return (
    <div className="container max-w-2xl mx-auto px-4 py-6 space-y-6">
      <h1 className="text-2xl font-bold">Punch Corrections</h1>
      <p className="text-muted-foreground text-sm">
        Forgot to clock in or out? Submit a correction request and an admin will review it.
      </p>

      <CorrectionForm />

      <div>
        <h2 className="text-lg font-semibold mb-3">Your Requests</h2>
        {(!corrections || corrections.length === 0) ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No correction requests yet.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {(corrections as PunchCorrection[]).map((c) => (
              <Card key={c.id}>
                <CardContent className="py-3">
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <p className="font-medium">Clock in: {formatDateTime(c.requested_clock_in)}</p>
                      {c.requested_clock_out && (
                        <p className="text-sm text-muted-foreground">
                          Clock out: {formatDateTime(c.requested_clock_out)}
                        </p>
                      )}
                      <p className="text-sm text-muted-foreground mt-1">
                        Reason: {c.reason}
                      </p>
                      {c.admin_notes && (
                        <p className="text-sm text-muted-foreground">Admin note: {c.admin_notes}</p>
                      )}
                    </div>
                    <Badge variant={statusVariant[c.status]}>
                      {c.status.charAt(0).toUpperCase() + c.status.slice(1)}
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
