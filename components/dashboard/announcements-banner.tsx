'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import type { Announcement } from '@/lib/supabase/types'

interface AnnouncementsBannerProps {
  announcements: Announcement[]
}

export function AnnouncementsBanner({ announcements }: AnnouncementsBannerProps) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())

  async function dismiss(id: string) {
    setDismissed((prev) => new Set([...prev, id]))
    await fetch('/api/announcements/dismiss', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ announcementId: id }),
    })
  }

  const visible = announcements.filter((a) => !dismissed.has(a.id))
  if (visible.length === 0) return null

  return (
    <div className="space-y-2">
      {visible.map((a) => (
        <div
          key={a.id}
          className="flex items-start gap-3 rounded-lg bg-primary/10 border border-primary/20 px-4 py-3"
        >
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm">{a.title}</p>
            <p className="text-sm text-muted-foreground mt-0.5">{a.body}</p>
          </div>
          <button
            onClick={() => dismiss(a.id)}
            className="text-muted-foreground hover:text-foreground shrink-0 mt-0.5"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  )
}
