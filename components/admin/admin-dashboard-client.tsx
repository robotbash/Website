'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Search, AlertTriangle, Users, ClipboardList } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatHours } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface EmployeeRow {
  id: string
  full_name: string
  email: string
  role: string
  is_active: boolean
  pto_balance: number
  annual_pto_hours: number
  clocked_in: boolean
  week_hours: number
  sick_ytd: number
  call_off_ytd: number
}

interface AdminDashboardClientProps {
  employees: EmployeeRow[]
  pendingCorrections: number
  overtimeThreshold: number
  overtimeWarning: number
}

export function AdminDashboardClient({
  employees,
  pendingCorrections,
  overtimeThreshold,
  overtimeWarning,
}: AdminDashboardClientProps) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<keyof EmployeeRow>('full_name')
  const [sortAsc, setSortAsc] = useState(true)
  const [selectedIdx, setSelectedIdx] = useState(-1)
  const searchRef = useRef<HTMLInputElement>(null)

  // Keyboard shortcuts
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === '/' && !['INPUT', 'TEXTAREA'].includes((e.target as Element).tagName)) {
        e.preventDefault()
        searchRef.current?.focus()
      }
      if (e.key === '?' && !['INPUT', 'TEXTAREA'].includes((e.target as Element).tagName)) {
        alert('Keyboard shortcuts:\n/ — Focus search\nj/k — Navigate rows\nEnter — Open selected row')
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [])

  const filtered = employees.filter((e) =>
    (e.full_name.toLowerCase().includes(search.toLowerCase()) ||
      e.email.toLowerCase().includes(search.toLowerCase())) &&
    (e.is_active || search.length > 0)
  )

  const sorted = [...filtered].sort((a, b) => {
    const av = a[sortKey]
    const bv = b[sortKey]
    if (typeof av === 'string' && typeof bv === 'string') {
      return sortAsc ? av.localeCompare(bv) : bv.localeCompare(av)
    }
    if (typeof av === 'number' && typeof bv === 'number') {
      return sortAsc ? av - bv : bv - av
    }
    if (typeof av === 'boolean' && typeof bv === 'boolean') {
      return sortAsc ? (bv ? 1 : -1) : (av ? 1 : -1)
    }
    return 0
  })

  function toggleSort(key: keyof EmployeeRow) {
    if (sortKey === key) setSortAsc((v) => !v)
    else { setSortKey(key); setSortAsc(true) }
  }

  function handleRowKeyDown(e: React.KeyboardEvent, idx: number, id: string) {
    if (e.key === 'j') setSelectedIdx(Math.min(idx + 1, sorted.length - 1))
    else if (e.key === 'k') setSelectedIdx(Math.max(idx - 1, 0))
    else if (e.key === 'Enter') router.push(`/admin/employees/${id}`)
  }

  return (
    <div className="container max-w-6xl mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        <div className="flex gap-2">
          {pendingCorrections > 0 && (
            <Button asChild variant="outline" size="sm" className="gap-1">
              <Link href="/admin/corrections">
                <ClipboardList className="h-4 w-4" />
                {pendingCorrections} pending correction{pendingCorrections !== 1 ? 's' : ''}
              </Link>
            </Button>
          )}
          <Button asChild size="sm">
            <Link href="/admin/employees/new">
              <Users className="h-4 w-4" />
              Add employee
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-2xl font-bold">{employees.filter((e) => e.is_active).length}</p>
            <p className="text-xs text-muted-foreground">active employees</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-2xl font-bold">{employees.filter((e) => e.clocked_in).length}</p>
            <p className="text-xs text-muted-foreground">currently clocked in</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className={cn('text-2xl font-bold', employees.filter((e) => e.week_hours >= overtimeThreshold).length > 0 ? 'text-orange-600' : '')}>
              {employees.filter((e) => e.week_hours >= overtimeThreshold).length}
            </p>
            <p className="text-xs text-muted-foreground">in overtime this week</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className={cn('text-2xl font-bold', pendingCorrections > 0 ? 'text-yellow-600' : '')}>
              {pendingCorrections}
            </p>
            <p className="text-xs text-muted-foreground">pending corrections</p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          ref={searchRef}
          placeholder="Search employees... (/)"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Employee table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                {[
                  { key: 'full_name', label: 'Employee' },
                  { key: 'clocked_in', label: 'Status' },
                  { key: 'week_hours', label: 'Week Hours' },
                  { key: 'pto_balance', label: 'PTO Balance' },
                  { key: 'sick_ytd', label: 'Sick YTD' },
                  { key: 'call_off_ytd', label: 'Call-Offs YTD' },
                ].map(({ key, label }) => (
                  <th
                    key={key}
                    className="text-left font-medium text-muted-foreground px-4 py-3 cursor-pointer hover:text-foreground whitespace-nowrap"
                    onClick={() => toggleSort(key as keyof EmployeeRow)}
                  >
                    {label} {sortKey === key ? (sortAsc ? '↑' : '↓') : ''}
                  </th>
                ))}
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {sorted.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-muted-foreground">
                    No employees found.
                  </td>
                </tr>
              ) : (
                sorted.map((emp, idx) => {
                  const isOT = emp.week_hours >= overtimeThreshold
                  const isWarning = !isOT && emp.week_hours >= overtimeWarning

                  return (
                    <tr
                      key={emp.id}
                      tabIndex={0}
                      className={cn(
                        'border-b last:border-0 hover:bg-muted/50 cursor-pointer transition-colors',
                        selectedIdx === idx && 'bg-muted/70',
                        !emp.is_active && 'opacity-50'
                      )}
                      onClick={() => router.push(`/admin/employees/${emp.id}`)}
                      onKeyDown={(e) => handleRowKeyDown(e, idx, emp.id)}
                    >
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium">{emp.full_name}</p>
                          <p className="text-xs text-muted-foreground">{emp.email}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {!emp.is_active ? (
                          <Badge variant="secondary">Inactive</Badge>
                        ) : emp.clocked_in ? (
                          <Badge variant="success">Clocked in</Badge>
                        ) : (
                          <Badge variant="outline">Out</Badge>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn(
                          'font-medium',
                          isOT ? 'text-orange-600 dark:text-orange-400' :
                          isWarning ? 'text-yellow-600 dark:text-yellow-400' : ''
                        )}>
                          {formatHours(emp.week_hours)}
                        </span>
                        {isOT && <AlertTriangle className="inline h-3 w-3 ml-1 text-orange-500" />}
                        {isWarning && <AlertTriangle className="inline h-3 w-3 ml-1 text-yellow-500" />}
                      </td>
                      <td className="px-4 py-3">{formatHours(emp.pto_balance)}</td>
                      <td className="px-4 py-3">{emp.sick_ytd}</td>
                      <td className="px-4 py-3">{emp.call_off_ytd}</td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/admin/employees/${emp.id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="text-primary hover:underline text-xs"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <p className="text-xs text-muted-foreground text-center">
        Press <kbd className="px-1 py-0.5 text-xs bg-muted border rounded">?</kbd> for keyboard shortcuts
      </p>
    </div>
  )
}
