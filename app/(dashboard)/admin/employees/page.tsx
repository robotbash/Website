import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Users } from 'lucide-react'
import type { User } from '@/lib/supabase/types'

export const metadata: Metadata = { title: 'Employees' }
export const dynamic = 'force-dynamic'

export default async function AdminEmployeesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: adminRow } = await supabase.from('users').select('role').eq('id', user.id).single()
  if (adminRow?.role !== 'admin') redirect('/')

  const { data: employees } = await supabase
    .from('users')
    .select('*')
    .order('full_name')

  return (
    <div className="container max-w-4xl mx-auto px-4 py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Employees</h1>
        <Button asChild size="sm">
          <Link href="/admin/employees/new">
            <Users className="h-4 w-4" />
            Add employee
          </Link>
        </Button>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left font-medium text-muted-foreground px-4 py-3">Name</th>
                <th className="text-left font-medium text-muted-foreground px-4 py-3">Role</th>
                <th className="text-left font-medium text-muted-foreground px-4 py-3">Status</th>
                <th className="text-left font-medium text-muted-foreground px-4 py-3">PTO Balance</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {(employees ?? []).map((emp: User) => (
                <tr key={emp.id} className="border-b last:border-0">
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium">{emp.full_name}</p>
                      <p className="text-xs text-muted-foreground">{emp.email}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={emp.role === 'admin' ? 'default' : 'outline'}>
                      {emp.role}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={emp.is_active ? 'success' : 'secondary'}>
                      {emp.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">{emp.pto_balance.toFixed(1)}h</td>
                  <td className="px-4 py-3">
                    <Link href={`/admin/employees/${emp.id}`} className="text-primary hover:underline text-xs">
                      Manage
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
