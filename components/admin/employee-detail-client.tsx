'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { formatDateTime, formatDate, formatHours, calcWorkedHours, calcBreakMinutes } from '@/lib/utils'
import type { User, TimeEntry, Break, PtoEntry, SickDay } from '@/lib/supabase/types'

interface EmployeeDetailClientProps {
  employee: User
  timeEntries: Array<TimeEntry & { breaks: Break[] }>
  ptoEntries: PtoEntry[]
  sickDays: SickDay[]
  breaksPaid: boolean
}

export function EmployeeDetailClient({ employee: emp, timeEntries, ptoEntries, sickDays, breaksPaid }: EmployeeDetailClientProps) {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)

  // Edit state
  const [fullName, setFullName] = useState(emp.full_name)
  const [email, setEmail] = useState(emp.email)
  const [role, setRole] = useState(emp.role)
  const [annualPto, setAnnualPto] = useState(String(emp.annual_pto_hours))
  const [editLoading, setEditLoading] = useState(false)

  // PTO balance adjust
  const [ptoAdj, setPtoAdj] = useState('')
  const [ptoReason, setPtoReason] = useState('')

  async function saveChanges() {
    setEditLoading(true)
    const res = await fetch(`/api/admin/employees/${emp.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fullName, email, role, annualPtoHours: parseFloat(annualPto) }),
    })
    const data = await res.json()
    if (!res.ok) { toast.error(data.error); setEditLoading(false); return }
    toast.success('Changes saved')
    setEditLoading(false)
    router.refresh()
  }

  async function toggleActive() {
    setLoading('active')
    const res = await fetch(`/api/admin/employees/${emp.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !emp.is_active }),
    })
    const data = await res.json()
    if (!res.ok) { toast.error(data.error); setLoading(null); return }
    toast.success(emp.is_active ? 'Account deactivated' : 'Account reactivated')
    setLoading(null)
    router.refresh()
  }

  async function forceLogout() {
    setLoading('logout')
    const res = await fetch(`/api/admin/employees/${emp.id}/force-logout`, { method: 'POST' })
    const data = await res.json()
    if (!res.ok) { toast.error(data.error); setLoading(null); return }
    toast.success('User has been signed out everywhere')
    setLoading(null)
  }

  async function sendPasswordReset() {
    setLoading('pwreset')
    const res = await fetch('/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: emp.email }),
    })
    if (!res.ok) { toast.error('Failed to send reset email'); setLoading(null); return }
    toast.success('Password reset email sent')
    setLoading(null)
  }

  async function adjustBalance() {
    const adj = parseFloat(ptoAdj)
    if (isNaN(adj) || adj === 0) { toast.error('Enter a valid adjustment'); return }
    if (!ptoReason.trim()) { toast.error('Reason is required'); return }

    setLoading('pto')
    const res = await fetch('/api/admin/pto/balance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: emp.id, adjustment: adj, reason: ptoReason }),
    })
    const data = await res.json()
    if (!res.ok) { toast.error(data.error); setLoading(null); return }
    toast.success(`Balance adjusted to ${formatHours(data.newBalance)}`)
    setPtoAdj('')
    setPtoReason('')
    setLoading(null)
    router.refresh()
  }

  return (
    <div className="container max-w-4xl mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{emp.full_name}</h1>
          <p className="text-muted-foreground">{emp.email}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={emp.is_active ? 'success' : 'secondary'}>
            {emp.is_active ? 'Active' : 'Inactive'}
          </Badge>
          <Badge variant={emp.role === 'admin' ? 'default' : 'outline'}>{emp.role}</Badge>
        </div>
      </div>

      <Tabs defaultValue="profile">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="timesheet">Timesheet</TabsTrigger>
          <TabsTrigger value="pto">PTO</TabsTrigger>
          <TabsTrigger value="sick">Sick / Call-Off</TabsTrigger>
          <TabsTrigger value="actions">Actions</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Edit Details</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Full name</Label>
                  <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Role</Label>
                  <Select value={role} onValueChange={(v) => setRole(v as 'employee' | 'admin')}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="employee">Employee</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Annual PTO hours</Label>
                  <Input type="number" min="0" step="0.5" value={annualPto} onChange={(e) => setAnnualPto(e.target.value)} />
                </div>
              </div>
              <Button onClick={saveChanges} disabled={editLoading}>
                {editLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                Save changes
              </Button>
            </CardContent>
          </Card>

          <Card className="mt-4">
            <CardHeader><CardTitle className="text-base">Adjust PTO Balance</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Current balance: <strong>{formatHours(emp.pto_balance)}</strong>
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Adjustment (+ or -)</Label>
                  <Input type="number" step="0.5" placeholder="+8 or -4" value={ptoAdj} onChange={(e) => setPtoAdj(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Reason</Label>
                  <Input placeholder="e.g. Year-end carryover" value={ptoReason} onChange={(e) => setPtoReason(e.target.value)} />
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={adjustBalance} disabled={loading === 'pto'}>
                {loading === 'pto' && <Loader2 className="h-4 w-4 animate-spin" />}
                Apply adjustment
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="timesheet" className="mt-4 space-y-2">
          {timeEntries.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground">No entries in the last 30 days.</CardContent></Card>
          ) : timeEntries.map((entry) => {
            const bMins = calcBreakMinutes(entry.breaks)
            const worked = entry.clock_out_at ? calcWorkedHours(entry.clock_in_at, entry.clock_out_at, bMins, breaksPaid) : null
            return (
              <Card key={entry.id}>
                <CardContent className="py-3">
                  <div className="flex justify-between gap-2 text-sm">
                    <div>
                      <p className="font-medium">{formatDateTime(entry.clock_in_at)}</p>
                      {entry.clock_out_at && <p className="text-muted-foreground">to {formatDateTime(entry.clock_out_at)}</p>}
                      {bMins > 0 && <p className="text-muted-foreground">{Math.round(bMins)}m break</p>}
                    </div>
                    {worked !== null ? <p className="font-semibold">{formatHours(worked)}</p> : <Badge variant="success">Active</Badge>}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </TabsContent>

        <TabsContent value="pto" className="mt-4 space-y-2">
          {ptoEntries.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground">No PTO entries.</CardContent></Card>
          ) : ptoEntries.map((e) => (
            <Card key={e.id}>
              <CardContent className="py-3 flex justify-between text-sm">
                <div>
                  <p className="font-medium">{formatDate(e.start_date)} — {formatDate(e.end_date)}</p>
                  {e.note && <p className="text-muted-foreground">{e.note}</p>}
                </div>
                <p className="font-semibold">{formatHours(e.hours)}</p>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="sick" className="mt-4 space-y-2">
          {sickDays.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground">No sick days this year.</CardContent></Card>
          ) : sickDays.map((s) => (
            <Card key={s.id}>
              <CardContent className="py-3 flex justify-between text-sm">
                <div>
                  <p className="font-medium">{formatDate(s.date)}</p>
                  {s.note && <p className="text-muted-foreground">{s.note}</p>}
                </div>
                <Badge variant={s.type === 'sick' ? 'warning' : 'secondary'}>
                  {s.type === 'sick' ? 'Sick' : 'Call-Off'}
                </Badge>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="actions" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Account Actions</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm font-medium mb-1">Sign out everywhere</p>
                <Button variant="outline" size="sm" disabled={loading === 'logout'} onClick={forceLogout}>
                  {loading === 'logout' && <Loader2 className="h-4 w-4 animate-spin" />}
                  Force logout
                </Button>
              </div>
              <Separator />
              <div>
                <p className="text-sm font-medium mb-1">Password reset</p>
                <Button variant="outline" size="sm" disabled={loading === 'pwreset'} onClick={sendPasswordReset}>
                  {loading === 'pwreset' && <Loader2 className="h-4 w-4 animate-spin" />}
                  Send reset email
                </Button>
              </div>
              <Separator />
              <div>
                <p className="text-sm font-medium mb-1">
                  {emp.is_active ? 'Deactivate account' : 'Reactivate account'}
                </p>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant={emp.is_active ? 'destructive' : 'outline'} size="sm" disabled={loading === 'active'}>
                      {loading === 'active' && <Loader2 className="h-4 w-4 animate-spin" />}
                      {emp.is_active ? 'Deactivate' : 'Reactivate'}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>
                        {emp.is_active ? 'Deactivate account?' : 'Reactivate account?'}
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        {emp.is_active
                          ? 'This prevents the employee from logging in. Their historical records are preserved.'
                          : 'This allows the employee to log in again.'}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={toggleActive}>
                        {emp.is_active ? 'Deactivate' : 'Reactivate'}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
