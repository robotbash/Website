'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Loader2, Download, Save } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { format, subDays, startOfWeek, endOfWeek } from 'date-fns'

interface ExportClientProps {
  employees: Array<{ id: string; full_name: string }>
  presets: Array<{ id: string; name: string; config: Record<string, unknown> }>
}

function getDateRange(type: string) {
  const today = new Date()
  switch (type) {
    case 'this_week':
      return { start: format(startOfWeek(today), 'yyyy-MM-dd'), end: format(endOfWeek(today), 'yyyy-MM-dd') }
    case 'last_week': {
      const lw = subDays(today, 7)
      return { start: format(startOfWeek(lw), 'yyyy-MM-dd'), end: format(endOfWeek(lw), 'yyyy-MM-dd') }
    }
    case 'this_month':
      return { start: format(new Date(today.getFullYear(), today.getMonth(), 1), 'yyyy-MM-dd'), end: format(today, 'yyyy-MM-dd') }
    default:
      return { start: format(subDays(today, 14), 'yyyy-MM-dd'), end: format(today, 'yyyy-MM-dd') }
  }
}

export function ExportClient({ employees, presets }: ExportClientProps) {
  const [type, setType] = useState('timesheets')
  const [startDate, setStartDate] = useState(format(subDays(new Date(), 14), 'yyyy-MM-dd'))
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([])
  const [presetName, setPresetName] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleExport() {
    setLoading(true)
    const params = new URLSearchParams({ type, startDate, endDate })
    if (selectedEmployees.length > 0) params.set('employeeIds', selectedEmployees.join(','))

    const res = await fetch(`/api/admin/export?${params}`)
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      toast.error(data.error ?? 'Export failed')
      setLoading(false)
      return
    }

    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${type}_${startDate}_to_${endDate}.csv`
    a.click()
    URL.revokeObjectURL(url)
    setLoading(false)
  }

  async function savePreset() {
    if (!presetName.trim()) { toast.error('Enter a preset name'); return }
    const res = await fetch('/api/admin/export-presets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: presetName,
        config: { type, date_range_type: 'custom', include_all_employees: selectedEmployees.length === 0, employee_ids: selectedEmployees },
      }),
    })
    const data = await res.json()
    if (!res.ok) { toast.error(data.error); return }
    toast.success('Preset saved')
    setPresetName('')
  }

  function loadPreset(preset: { config: Record<string, unknown> }) {
    setType(preset.config.type as string)
    if (preset.config.date_range_type !== 'custom') {
      const range = getDateRange(preset.config.date_range_type as string)
      setStartDate(range.start); setEndDate(range.end)
    }
    setSelectedEmployees((preset.config.employee_ids as string[]) ?? [])
  }

  return (
    <div className="space-y-6">
      {presets.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Saved Presets</CardTitle></CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {presets.map((p) => (
              <Button key={p.id} variant="outline" size="sm" onClick={() => loadPreset(p)}>
                {p.name}
              </Button>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle className="text-base">Configure Export</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Data type</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="timesheets">Timesheets</SelectItem>
                <SelectItem value="pto">PTO usage</SelectItem>
                <SelectItem value="sick_days">Sick days</SelectItem>
                <SelectItem value="call_offs">Call-offs</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Start date</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>End date</Label>
              <Input type="date" value={endDate} min={startDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Employees (leave blank for all)</Label>
            <Select
              value=""
              onValueChange={(id) => {
                setSelectedEmployees((prev) =>
                  prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
                )
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder={selectedEmployees.length === 0 ? 'All employees' : `${selectedEmployees.length} selected`} />
              </SelectTrigger>
              <SelectContent>
                {employees.map((emp) => (
                  <SelectItem key={emp.id} value={emp.id}>
                    {selectedEmployees.includes(emp.id) ? '✓ ' : ''}{emp.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2">
            <Button onClick={handleExport} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              Download CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Save as Preset</CardTitle></CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              placeholder="Preset name, e.g. Biweekly Payroll"
              value={presetName}
              onChange={(e) => setPresetName(e.target.value)}
            />
            <Button variant="outline" onClick={savePreset}>
              <Save className="h-4 w-4" />
              Save
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
