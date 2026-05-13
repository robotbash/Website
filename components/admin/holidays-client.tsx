'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2, Plus } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { formatDate } from '@/lib/utils'
import type { Holiday } from '@/lib/supabase/types'

interface HolidaysClientProps { holidays: Holiday[] }

export function HolidaysClient({ holidays }: HolidaysClientProps) {
  const router = useRouter()
  const [date, setDate] = useState('')
  const [name, setName] = useState('')
  const [isPaid, setIsPaid] = useState(true)
  const [loading, setLoading] = useState(false)

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const res = await fetch('/api/admin/holidays', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date, name, isPaid }),
    })
    const data = await res.json()
    if (!res.ok) { toast.error(data.error); setLoading(false); return }
    toast.success('Holiday added')
    setDate(''); setName(''); setLoading(false)
    router.refresh()
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="pt-4">
          <form onSubmit={handleAdd} className="space-y-4">
            <div className="grid grid-cols-3 gap-3 items-end">
              <div className="space-y-2">
                <Label htmlFor="hdate">Date</Label>
                <Input id="hdate" type="date" required value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="hname">Name</Label>
                <Input id="hname" required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. New Year's Day" />
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Checkbox id="paid" checked={isPaid} onCheckedChange={(v) => setIsPaid(!!v)} />
                  <Label htmlFor="paid">Paid holiday</Label>
                </div>
                <Button type="submit" size="sm" className="w-full" disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  Add
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-2">
        {holidays.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              No holidays set. Add one above.
            </CardContent>
          </Card>
        ) : holidays.map((h) => (
          <Card key={h.id}>
            <CardContent className="py-3 flex justify-between items-center">
              <div>
                <p className="font-medium">{h.name}</p>
                <p className="text-sm text-muted-foreground">{formatDate(h.date)}</p>
              </div>
              <Badge variant={h.is_paid ? 'success' : 'secondary'}>
                {h.is_paid ? 'Paid' : 'Unpaid'}
              </Badge>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
