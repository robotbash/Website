'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { format } from 'date-fns'

export function CorrectionForm() {
  const router = useRouter()
  const today = format(new Date(), 'yyyy-MM-dd')
  const [date, setDate] = useState(today)
  const [clockIn, setClockIn] = useState('')
  const [clockOut, setClockOut] = useState('')
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!clockIn) { toast.error('Clock-in time is required'); return }

    const clockInISO = new Date(`${date}T${clockIn}:00`).toISOString()
    const clockOutISO = clockOut ? new Date(`${date}T${clockOut}:00`).toISOString() : null

    setLoading(true)
    const res = await fetch('/api/corrections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requestedClockIn: clockInISO,
        requestedClockOut: clockOutISO,
        reason,
      }),
    })
    const data = await res.json()
    if (!res.ok) { toast.error(data.error); setLoading(false); return }

    toast.success('Correction submitted. An admin will review it.')
    setClockIn('')
    setClockOut('')
    setReason('')
    setLoading(false)
    router.refresh()
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Submit a Correction</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="date">Date</Label>
            <Input id="date" type="date" max={today} value={date} onChange={(e) => setDate(e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="clockin">Clock-in time</Label>
              <Input id="clockin" type="time" required value={clockIn} onChange={(e) => setClockIn(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="clockout">Clock-out time</Label>
              <Input id="clockout" type="time" value={clockOut} onChange={(e) => setClockOut(e.target.value)} />
              <p className="text-xs text-muted-foreground">Leave blank if still clocked in</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">Reason</Label>
            <Textarea
              id="reason"
              required
              placeholder="Briefly explain what happened..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>

          <Button type="submit" disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Submit correction
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
