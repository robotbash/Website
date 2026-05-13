'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { formatDateTime } from '@/lib/utils'
import type { PunchCorrection } from '@/lib/supabase/types'

interface CorrectionWithEmployee extends PunchCorrection {
  employee: { full_name: string; email: string }
}

export function AdminCorrectionsClient({ corrections }: { corrections: CorrectionWithEmployee[] }) {
  const router = useRouter()
  const pending = corrections.filter((c) => c.status === 'pending')
  const reviewed = corrections.filter((c) => c.status !== 'pending')

  return (
    <Tabs defaultValue="pending">
      <TabsList>
        <TabsTrigger value="pending">
          Pending ({pending.length})
        </TabsTrigger>
        <TabsTrigger value="reviewed">Reviewed ({reviewed.length})</TabsTrigger>
      </TabsList>

      <TabsContent value="pending" className="mt-4 space-y-4">
        {pending.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              No pending corrections.
            </CardContent>
          </Card>
        ) : (
          pending.map((c) => <CorrectionCard key={c.id} correction={c} onDone={() => router.refresh()} />)
        )}
      </TabsContent>

      <TabsContent value="reviewed" className="mt-4 space-y-3">
        {reviewed.map((c) => (
          <Card key={c.id}>
            <CardContent className="py-4">
              <div className="flex justify-between items-start gap-2">
                <div>
                  <p className="font-medium">{c.employee.full_name}</p>
                  <p className="text-sm text-muted-foreground">
                    Clock in: {formatDateTime(c.requested_clock_in)}
                  </p>
                  {c.requested_clock_out && (
                    <p className="text-sm text-muted-foreground">
                      Clock out: {formatDateTime(c.requested_clock_out)}
                    </p>
                  )}
                  <p className="text-sm mt-1">{c.reason}</p>
                  {c.admin_notes && (
                    <p className="text-xs text-muted-foreground">Note: {c.admin_notes}</p>
                  )}
                </div>
                <Badge variant={c.status === 'approved' ? 'success' : 'destructive'}>
                  {c.status.charAt(0).toUpperCase() + c.status.slice(1)}
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </TabsContent>
    </Tabs>
  )
}

function CorrectionCard({ correction: c, onDone }: { correction: CorrectionWithEmployee; onDone: () => void }) {
  const [loading, setLoading] = useState<'approve' | 'deny' | null>(null)
  const [clockIn, setClockIn] = useState(c.requested_clock_in.slice(0, 16))
  const [clockOut, setClockOut] = useState(c.requested_clock_out?.slice(0, 16) ?? '')
  const [adminNotes, setAdminNotes] = useState('')

  async function review(status: 'approved' | 'denied') {
    setLoading(status === 'approved' ? 'approve' : 'deny')
    const res = await fetch(`/api/admin/corrections/${c.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status,
        adminNotes: adminNotes || undefined,
        requestedClockIn: new Date(clockIn).toISOString(),
        requestedClockOut: clockOut ? new Date(clockOut).toISOString() : null,
      }),
    })
    const data = await res.json()
    if (!res.ok) { toast.error(data.error); setLoading(null); return }
    toast.success(status === 'approved' ? 'Correction approved' : 'Correction denied')
    onDone()
    setLoading(null)
  }

  return (
    <Card>
      <CardContent className="py-4 space-y-4">
        <div className="flex justify-between items-start">
          <div>
            <p className="font-medium">{c.employee.full_name}</p>
            <p className="text-xs text-muted-foreground">{c.employee.email}</p>
          </div>
          <Badge variant="warning">Pending</Badge>
        </div>

        <div>
          <p className="text-sm font-medium mb-1">Requested times (edit if needed):</p>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Clock in</Label>
              <Input
                type="datetime-local"
                value={clockIn}
                onChange={(e) => setClockIn(e.target.value)}
              />
            </div>
            <div>
              <Label className="text-xs">Clock out</Label>
              <Input
                type="datetime-local"
                value={clockOut}
                onChange={(e) => setClockOut(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div>
          <Label className="text-xs">Employee's reason</Label>
          <p className="text-sm bg-muted rounded px-3 py-2">{c.reason}</p>
        </div>

        <div>
          <Label className="text-xs" htmlFor={`notes-${c.id}`}>Admin note (optional)</Label>
          <Textarea
            id={`notes-${c.id}`}
            placeholder="Explain the decision if needed..."
            value={adminNotes}
            onChange={(e) => setAdminNotes(e.target.value)}
            className="mt-1"
          />
        </div>

        <div className="flex gap-2">
          <Button
            variant="default"
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
