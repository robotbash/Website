'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { Loader2, Coffee, StopCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { formatRunningTimer, formatTime } from '@/lib/utils'
import { differenceInSeconds, parseISO } from 'date-fns'

interface ActiveEntry {
  id: string
  clock_in_at: string
  is_on_break: boolean
  break_start_at: string | null
}

interface ClockWidgetProps {
  activeEntry: ActiveEntry | null
  userName: string
}

const UNDO_WINDOW = 10 // seconds

export function ClockWidget({ activeEntry: initialEntry, userName }: ClockWidgetProps) {
  const [entry, setEntry] = useState(initialEntry)
  const [loading, setLoading] = useState(false)
  const [timer, setTimer] = useState('')
  const [breakTimer, setBreakTimer] = useState('')
  const [undoState, setUndoState] = useState<{ type: 'clock_in' | 'clock_out'; entryId: string; countdown: number } | null>(null)

  // Running timer
  useEffect(() => {
    if (!entry) { setTimer(''); return }
    const update = () => {
      if (entry.is_on_break && entry.break_start_at) {
        setBreakTimer(formatRunningTimer(entry.break_start_at))
      }
      setTimer(formatRunningTimer(entry.clock_in_at))
    }
    update()
    const id = setInterval(update, 1000)
    return () => clearInterval(id)
  }, [entry])

  // Undo countdown
  useEffect(() => {
    if (!undoState) return
    if (undoState.countdown <= 0) { setUndoState(null); return }
    const id = setTimeout(() => {
      setUndoState((s) => s ? { ...s, countdown: s.countdown - 1 } : null)
    }, 1000)
    return () => clearTimeout(id)
  }, [undoState])

  // Update tab title
  useEffect(() => {
    if (entry) {
      document.title = `● Clocked In • ${timer}`
    } else {
      document.title = 'Time Tracker'
    }
    return () => { document.title = 'Time Tracker' }
  }, [entry, timer])

  const vibrate = () => {
    if ('vibrate' in navigator) navigator.vibrate(50)
  }

  async function clockIn() {
    setLoading(true)
    const res = await fetch('/api/time-entries/clock-in', { method: 'POST' })
    const data = await res.json()
    if (!res.ok) { toast.error(data.error); setLoading(false); return }

    vibrate()
    const newEntry = { id: data.entry.id, clock_in_at: data.entry.clock_in_at, is_on_break: false, break_start_at: null }
    setEntry(newEntry)
    setLoading(false)

    toast('Clocked in', {
      description: `At ${formatTime(data.entry.clock_in_at)}`,
      action: {
        label: `Undo (${UNDO_WINDOW}s)`,
        onClick: () => handleUndo('clock_in', data.entry.id),
      },
      duration: UNDO_WINDOW * 1000,
    })

    setUndoState({ type: 'clock_in', entryId: data.entry.id, countdown: UNDO_WINDOW })
  }

  async function clockOut() {
    setLoading(true)
    const entryId = entry!.id
    const res = await fetch('/api/time-entries/clock-out', { method: 'POST' })
    const data = await res.json()
    if (!res.ok) { toast.error(data.error); setLoading(false); return }

    vibrate()
    setEntry(null)
    setLoading(false)

    toast('Clocked out', {
      description: `At ${formatTime(data.entry.clock_out_at)}`,
      action: {
        label: `Undo (${UNDO_WINDOW}s)`,
        onClick: () => handleUndo('clock_out', entryId),
      },
      duration: UNDO_WINDOW * 1000,
    })
  }

  async function handleUndo(type: 'clock_in' | 'clock_out', entryId: string) {
    const res = await fetch('/api/time-entries/undo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, entryId }),
    })
    const data = await res.json()
    if (!res.ok) { toast.error(data.error); return }

    if (type === 'clock_in') {
      setEntry(null)
      toast.success('Clock-in undone')
    } else {
      // Re-fetch active entry would require page reload; for now refresh
      window.location.reload()
    }
    setUndoState(null)
  }

  async function startBreak() {
    setLoading(true)
    const res = await fetch('/api/time-entries/break-start', { method: 'POST' })
    const data = await res.json()
    if (!res.ok) { toast.error(data.error); setLoading(false); return }
    vibrate()
    setEntry((e) => e ? { ...e, is_on_break: true, break_start_at: data.break.start_at } : e)
    setLoading(false)
    toast.success('Break started')
  }

  async function endBreak() {
    setLoading(true)
    const res = await fetch('/api/time-entries/break-end', { method: 'POST' })
    const data = await res.json()
    if (!res.ok) { toast.error(data.error); setLoading(false); return }
    vibrate()
    setEntry((e) => e ? { ...e, is_on_break: false, break_start_at: null } : e)
    setLoading(false)
    toast.success('Break ended')
  }

  const isClockedIn = !!entry
  const isOnBreak = entry?.is_on_break ?? false

  return (
    <Card className={`overflow-hidden transition-colors duration-500 ${
      isClockedIn
        ? isOnBreak
          ? 'border-yellow-400 bg-yellow-50 dark:bg-yellow-950/30'
          : 'border-green-400 bg-green-50 dark:bg-green-950/30'
        : 'border-border bg-card'
    }`}>
      <CardContent className="p-6">
        {/* Status banner */}
        <div className={`text-center mb-6 rounded-lg py-3 px-4 ${
          isClockedIn
            ? isOnBreak
              ? 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-200'
              : 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-200'
            : 'bg-muted text-muted-foreground'
        }`}>
          <p className="text-lg font-semibold">
            {isClockedIn
              ? isOnBreak
                ? `On break for ${breakTimer}`
                : `Clocked in for ${timer}`
              : 'Not clocked in'}
          </p>
          {isClockedIn && (
            <p className="text-sm mt-0.5 opacity-80">
              {isOnBreak ? 'Break started' : 'Since'} {formatTime(isOnBreak ? entry!.break_start_at! : entry!.clock_in_at)}
            </p>
          )}
          {!isClockedIn && (
            <p className="text-sm mt-0.5 opacity-70">
              Tap the button below to start your shift
            </p>
          )}
        </div>

        {/* Main clock button */}
        <div className="flex justify-center mb-4">
          <Button
            size="xl"
            variant={isClockedIn && !isOnBreak ? 'destructive' : 'default'}
            className={`w-48 h-16 text-lg font-bold shadow-lg ${
              !isClockedIn ? 'bg-green-600 hover:bg-green-700 text-white' : ''
            }`}
            disabled={loading}
            onClick={isClockedIn ? clockOut : clockIn}
          >
            {loading && <Loader2 className="h-5 w-5 animate-spin" />}
            {!loading && (isClockedIn ? 'Clock Out' : 'Clock In')}
          </Button>
        </div>

        {/* Break button */}
        {isClockedIn && (
          <div className="flex justify-center">
            <Button
              variant="outline"
              size="sm"
              disabled={loading}
              onClick={isOnBreak ? endBreak : startBreak}
              className="gap-2"
            >
              {isOnBreak ? (
                <>
                  <StopCircle className="h-4 w-4" />
                  End break
                </>
              ) : (
                <>
                  <Coffee className="h-4 w-4" />
                  Start break
                </>
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
