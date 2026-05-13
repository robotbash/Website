'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { formatDateTime } from '@/lib/utils'
import { isPast, parseISO } from 'date-fns'
import type { Announcement } from '@/lib/supabase/types'

export function AnnouncementsClient({ announcements }: { announcements: Announcement[] }) {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [expiresAt, setExpiresAt] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const res = await fetch('/api/admin/announcements', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        body,
        expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
      }),
    })
    const data = await res.json()
    if (!res.ok) { toast.error(data.error); setLoading(false); return }
    toast.success('Announcement posted')
    setTitle(''); setBody(''); setExpiresAt(''); setLoading(false)
    router.refresh()
  }

  const active = announcements.filter((a) => !a.expires_at || !isPast(parseISO(a.expires_at)))
  const expired = announcements.filter((a) => a.expires_at && isPast(parseISO(a.expires_at)))

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="pt-4">
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Office closed Friday" />
            </div>
            <div className="space-y-2">
              <Label>Body</Label>
              <Textarea required value={body} onChange={(e) => setBody(e.target.value)} placeholder="Details..." />
            </div>
            <div className="space-y-2">
              <Label>Expires at (optional)</Label>
              <Input type="datetime-local" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
              <p className="text-xs text-muted-foreground">Leave blank to keep until manually removed.</p>
            </div>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Post announcement
            </Button>
          </form>
        </CardContent>
      </Card>

      {active.length > 0 && (
        <div>
          <h2 className="text-base font-semibold mb-3">Active</h2>
          <div className="space-y-2">
            {active.map((a) => (
              <Card key={a.id}>
                <CardContent className="py-3">
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <p className="font-medium">{a.title}</p>
                      <p className="text-sm text-muted-foreground">{a.body}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Posted {formatDateTime(a.created_at)}
                        {a.expires_at && ` · Expires ${formatDateTime(a.expires_at)}`}
                      </p>
                    </div>
                    <Badge variant="success">Active</Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {expired.length > 0 && (
        <div>
          <h2 className="text-base font-semibold mb-3 text-muted-foreground">Expired</h2>
          <div className="space-y-2">
            {expired.map((a) => (
              <Card key={a.id} className="opacity-60">
                <CardContent className="py-3">
                  <p className="font-medium">{a.title}</p>
                  <p className="text-xs text-muted-foreground">Expired {formatDateTime(a.expires_at!)}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
