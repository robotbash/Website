'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'

interface AdminSettingsClientProps {
  settings: Record<string, unknown>
}

export function AdminSettingsClient({ settings }: AdminSettingsClientProps) {
  const [breaksPaid, setBreaksPaid] = useState((settings.breaks_paid_default as boolean) ?? false)
  const [rolloverPolicy, setRolloverPolicy] = useState((settings.pto_rollover_policy as string) ?? 'reset')
  const [rolloverCap, setRolloverCap] = useState(String(settings.pto_rollover_cap_hours ?? '40'))
  const [payPeriod, setPayPeriod] = useState((settings.pay_period_type as string) ?? 'biweekly')
  const [otThreshold, setOtThreshold] = useState(String(settings.overtime_threshold ?? '40'))
  const [otWarning, setOtWarning] = useState(String(settings.overtime_warning ?? '35'))
  const [loading, setLoading] = useState(false)

  async function handleSave() {
    setLoading(true)
    const res = await fetch('/api/admin/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        breaks_paid_default: breaksPaid,
        pto_rollover_policy: rolloverPolicy,
        pto_rollover_cap_hours: parseFloat(rolloverCap),
        pay_period_type: payPeriod,
        overtime_threshold: parseFloat(otThreshold),
        overtime_warning: parseFloat(otWarning),
      }),
    })
    const data = await res.json()
    if (!res.ok) { toast.error(data.error); setLoading(false); return }
    toast.success('Settings saved')
    setLoading(false)
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle className="text-base">Breaks</CardTitle></CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <Checkbox id="bpaid" checked={breaksPaid} onCheckedChange={(v) => setBreaksPaid(!!v)} />
            <Label htmlFor="bpaid">Breaks are paid by default</Label>
          </div>
          <p className="text-xs text-muted-foreground mt-1">Applies to new break entries. Does not affect existing records.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">PTO Rollover</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Year-end policy</Label>
            <Select value={rolloverPolicy} onValueChange={setRolloverPolicy}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="reset">Reset to zero (use it or lose it)</SelectItem>
                <SelectItem value="carryover">Carry over all hours</SelectItem>
                <SelectItem value="carryover_cap">Carry over up to a cap</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {rolloverPolicy === 'carryover_cap' && (
            <div className="space-y-2">
              <Label>Max hours to carry over</Label>
              <Input type="number" min="0" step="1" value={rolloverCap} onChange={(e) => setRolloverCap(e.target.value)} className="w-32" />
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Pay Period</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label>Type</Label>
            <Select value={payPeriod} onValueChange={setPayPeriod}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="biweekly">Biweekly</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Overtime Alerts</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>Warning threshold (hours)</Label>
            <Input type="number" min="1" max="168" value={otWarning} onChange={(e) => setOtWarning(e.target.value)} />
            <p className="text-xs text-muted-foreground">Shows yellow alert at this many hours</p>
          </div>
          <div className="space-y-2">
            <Label>Overtime threshold (hours)</Label>
            <Input type="number" min="1" max="168" value={otThreshold} onChange={(e) => setOtThreshold(e.target.value)} />
            <p className="text-xs text-muted-foreground">Shows orange alert at this many hours</p>
          </div>
        </CardContent>
      </Card>

      <Button onClick={handleSave} disabled={loading}>
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        Save settings
      </Button>
    </div>
  )
}
