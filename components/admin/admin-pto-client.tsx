'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2, AlertTriangle } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { formatDate, formatPtoDays } from '@/lib/utils'
import type { PtoEntryWithEmployee, PtoConflict } from '@/app/(dashboard)/admin/pto/page'

interface Props {
  entries: PtoEntryWithEmployee[]
  conflicts: Record<string, PtoConflict[]>
}

export function AdminPtoClient({ entries, conflicts }: Props) {
  const router = useRouter()
  const pending = entries.filter((e) => e.status === 'pending')
  const reviewed = entries.filter((e) => e.status !== 'pending')

  return (
    <Tabs defaultValue="pending">
      <TabsList>
        <TabsTrigger value="pending">Pending ({pending.length})</TabsTrigger>
        <TabsTrigger value="reviewed">Reviewed ({reviewed.length})</TabsTrigger>
      </TabsList>

      <TabsContent value="pending" className="mt-4 space-y-4">
        {pending.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              No pending PTO requests.
            </CardContent>
          </Card>
        ) : (
          pending.map((e) => (
            <PtoRequestCard
              key={e.id}
              entry={e}
              conflicts={conflicts[e.id] ?? []}
              onDone={() => router.refresh()}
            />
          ))
        )}
      </TabsContent>

      <TabsContent value="reviewed" className="mt-4 space-y-3">
        {reviewed.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              No reviewed requests yet.
            </CardContent>
          </Card>
        ) : (
          reviewed.map((e) => (
            <Card key={e.id}>
              <CardContent className="py-4">
                <div className="flex justify-between items-start gap-2">
                  <div>
                    <p className="font-medium">{e.employee?.full_name ?? 'Unknown'}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatDate(e.start_date)} — {formatDate(e.end_date)} · {formatPtoDays(e.hours)}
                    </p>
                    {e.note && <p className="text-sm mt-1">{e.note}</p>}
                    {e.admin_notes && (
                      <p className="text-xs text-muted-foreground mt-1">Note: {e.admin_notes}</p>
                    )}
                  </div>
                  <Badge variant={e.status === 'approved' ? 'success' : 'destructive'}>
                    {e.status.charAt(0).toUpperCase() + e.status.slice(1)}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </TabsContent>
    </Tabs>
  )
}

function PtoRequestCard({
  entry: e,
  conflicts,
  onDone,
}: {
  entry: PtoEntryWithEmployee
  conflicts: PtoConflict[]
  onDone: () => void
}) {
  const [loading, setLoading] = useState<'approve' | 'deny' | null>(null)
  const [adminNotes, setAdminNotes] = useState('')

  async function review(status: 'approved' | 'denied') {
    setLoading(status === 'approved' ? 'approve' : 'deny')
    const res = await fetch(`/api/admin/pto/${e.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, adminNotes: adminNotes || undefined }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      toast.error(data.error ?? 'Something went wrong')
      setLoading(null)
      return
    }
    toast.success(status === 'approved' ? 'PTO approved' : 'PTO denied')
    onDone()
    setLoading(null)
  }

  return (
    <Card>
      <CardContent className="py-4 space-y-4">
        <div className="flex justify-between items-start">
          <div>
            <p className="font-medium">{e.employee?.full_name ?? 'Unknown'}</p>
            <p className="text-xs text-muted-foreground">{e.employee?.email}</p>
          </div>
          <Badge variant="warning">Pending</Badge>
        </div>

        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <Label className="text-xs">Dates</Label>
            <p>{formatDate(e.start_date)} — {formatDate(e.end_date)}</p>
          </div>
          <div>
            <Label className="text-xs">Amount</Label>
            <p>{formatPtoDays(e.hours)} ({e.hours}h)</p>
          </div>
        </div>

        {e.note && (
          <div>
            <Label className="text-xs">Employee's note</Label>
            <p className="text-sm bg-muted rounded px-3 py-2">{e.note}</p>
          </div>
        )}

        {conflicts.length > 0 && (
          <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 dark:border-amber-700 dark:bg-amber-950">
            <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-medium text-sm">
              <AlertTriangle className="h-4 w-4" />
              {conflicts.length} overlapping {conflicts.length === 1 ? 'request' : 'requests'}
            </div>
            <ul className="mt-1 space-y-0.5 text-xs text-amber-800 dark:text-amber-300">
              {conflicts.map((c, i) => (
                <li key={i}>
                  {c.employeeName}: {formatDate(c.start_date)} — {formatDate(c.end_date)} ({c.status})
                </li>
              ))}
            </ul>
          </div>
        )}

        <div>
          <Label className="text-xs" htmlFor={`notes-${e.id}`}>Note (optional)</Label>
          <Textarea
            id={`notes-${e.id}`}
            placeholder="Explain the decision if needed..."
            value={adminNotes}
            onChange={(ev) => setAdminNotes(ev.target.value)}
            className="mt-1"
          />
        </div>

        <div className="flex gap-2">
          <Button
            size="sm"
            disabled={!!loading}
            onClick={() => review('approved')}
            className="bg-green-600 hover:bg-green-700"
          >
            {loading === 'approve' && <Loader2 className="h-3 w-3 animate-spin" />}
            Approve
          </Button>
          <Button
            variant="destructive"
            size="sm"
            disabled={!!loading}
            onClick={() => review('denied')}
          >
            {loading === 'deny' && <Loader2 className="h-3 w-3 animate-spin" />}
            Deny
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
