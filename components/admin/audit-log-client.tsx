'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { formatDateTime } from '@/lib/utils'

interface AuditLogEntry {
  id: string
  action: string
  created_at: string
  ip_address: string | null
  actor: { full_name: string } | null
  target: { full_name: string } | null
  old_value: Record<string, unknown> | null
  new_value: Record<string, unknown> | null
}

export function AuditLogClient({ logs }: { logs: AuditLogEntry[] }) {
  const [search, setSearch] = useState('')

  const filtered = logs.filter((l) =>
    l.action.includes(search.toLowerCase()) ||
    (l.actor?.full_name?.toLowerCase().includes(search.toLowerCase())) ||
    (l.target?.full_name?.toLowerCase().includes(search.toLowerCase()))
  )

  return (
    <div className="space-y-3">
      <Input
        placeholder="Filter by action or name..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left font-medium text-muted-foreground px-4 py-3">Time</th>
                <th className="text-left font-medium text-muted-foreground px-4 py-3">Action</th>
                <th className="text-left font-medium text-muted-foreground px-4 py-3">By</th>
                <th className="text-left font-medium text-muted-foreground px-4 py-3">Target</th>
                <th className="text-left font-medium text-muted-foreground px-4 py-3">IP</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-muted-foreground">No entries found.</td>
                </tr>
              ) : filtered.map((log) => (
                <tr key={log.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="px-4 py-2 whitespace-nowrap text-xs text-muted-foreground">
                    {formatDateTime(log.created_at)}
                  </td>
                  <td className="px-4 py-2">
                    <Badge variant="outline" className="font-mono text-xs">
                      {log.action.replace(/_/g, ' ')}
                    </Badge>
                  </td>
                  <td className="px-4 py-2">{log.actor?.full_name ?? 'System'}</td>
                  <td className="px-4 py-2">{log.target?.full_name ?? ''}</td>
                  <td className="px-4 py-2 text-xs text-muted-foreground font-mono">{log.ip_address ?? ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
