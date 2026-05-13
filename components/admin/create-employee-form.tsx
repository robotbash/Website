'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

export function CreateEmployeeForm() {
  const router = useRouter()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<'employee' | 'admin'>('employee')
  const [annualPtoHours, setAnnualPtoHours] = useState('40')
  const [hireDate, setHireDate] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const res = await fetch('/api/admin/employees', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName,
        email,
        role,
        annualPtoHours: parseFloat(annualPtoHours),
        hireDate: hireDate || null,
      }),
    })

    const data = await res.json()
    if (!res.ok) { toast.error(data.error); setLoading(false); return }

    toast.success(`Invite sent to ${email}`)
    router.push('/admin/employees')
    router.refresh()
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">New Employee Details</CardTitle>
        <CardDescription>
          An invite email will be sent with a setup link that expires in 48 hours.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Full name</Label>
            <Input id="name" required value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Jane Smith" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="jane@company.com" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select value={role} onValueChange={(v) => setRole(v as 'employee' | 'admin')}>
                <SelectTrigger id="role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="employee">Employee</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="pto">Annual PTO hours</Label>
              <Input
                id="pto"
                type="number"
                min="0"
                step="0.5"
                value={annualPtoHours}
                onChange={(e) => setAnnualPtoHours(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="hire">Hire date (optional)</Label>
            <Input id="hire" type="date" value={hireDate} onChange={(e) => setHireDate(e.target.value)} />
          </div>

          <div className="flex gap-2">
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Send invite
            </Button>
            <Button type="button" variant="outline" onClick={() => router.back()}>
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
