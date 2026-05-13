'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatHours } from '@/lib/utils'
import { differenceInCalendarDays, parseISO } from 'date-fns'
import { useRouter } from 'next/navigation'

interface PtoRequestFormProps {
  balance: number
}

export function PtoRequestForm({ balance }: PtoRequestFormProps) {
  const router = useRouter()
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [hoursPerDay, setHoursPerDay] = useState('8')
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)

  const days = startDate && endDate && endDate >= startDate
    ? differenceInCalendarDays(parseISO(endDate), parseISO(startDate)) + 1
    : 0
  const totalHours = days * parseFloat(hoursPerDay || '0')
  const wouldExceed = totalHours > balance

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (wouldExceed) {
      toast.error(`Not enough balance. You have ${formatHours(balance)} remaining.`)
      return
    }

    setLoading(true)
    const res = await fetch('/api/pto', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ startDate, endDate, hoursPerDay: parseFloat(hoursPerDay), note }),
    })
    const data = await res.json()
    if (!res.ok) { toast.error(data.error); setLoading(false); return }

    toast.success('PTO submitted')
    setStartDate('')
    setEndDate('')
    setNote('')
    setLoading(false)
    router.refresh()
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Request Time Off</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="start">Start date</Label>
              <Input id="start" type="date" required value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end">End date</Label>
              <Input id="end" type="date" required value={endDate} min={startDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="hours">Hours per day</Label>
            <Input
              id="hours"
              type="number"
              min="0.5"
              max="24"
              step="0.5"
              value={hoursPerDay}
              onChange={(e) => setHoursPerDay(e.target.value)}
            />
          </div>

          {days > 0 && (
            <div className={`rounded-md px-3 py-2 text-sm ${wouldExceed ? 'bg-destructive/10 text-destructive' : 'bg-muted'}`}>
              {days} day{days !== 1 ? 's' : ''} = <strong>{formatHours(totalHours)}</strong>
              {wouldExceed && ` (exceeds your ${formatHours(balance)} balance)`}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="note">Note (optional)</Label>
            <Textarea id="note" placeholder="Any details..." value={note} onChange={(e) => setNote(e.target.value)} />
          </div>

          <Button type="submit" disabled={loading || wouldExceed || days === 0}>
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Submit PTO request
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
