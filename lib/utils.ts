import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import {
  differenceInMinutes,
  format,
  formatDuration,
  intervalToDuration,
  parseISO,
} from 'date-fns'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatHours(hours: number): string {
  if (hours < 0) hours = 0
  const h = Math.floor(hours)
  const m = Math.round((hours - h) * 60)
  if (h === 0) return `${m}m`
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}

export function formatHoursDecimal(hours: number): string {
  return hours.toFixed(2)
}

export function calcWorkedHours(
  clockIn: string | Date,
  clockOut: string | Date | null,
  breakMinutes = 0,
  breaksPaid = false
): number {
  const start = typeof clockIn === 'string' ? parseISO(clockIn) : clockIn
  const end = clockOut
    ? typeof clockOut === 'string'
      ? parseISO(clockOut)
      : clockOut
    : new Date()

  const totalMinutes = differenceInMinutes(end, start)
  const workedMinutes = breaksPaid
    ? totalMinutes
    : totalMinutes - breakMinutes

  return Math.max(0, workedMinutes / 60)
}

export function calcBreakMinutes(
  breaks: Array<{ start_at: string; end_at: string | null }>
): number {
  return breaks.reduce((acc, b) => {
    const start = parseISO(b.start_at)
    const end = b.end_at ? parseISO(b.end_at) : new Date()
    return acc + differenceInMinutes(end, start)
  }, 0)
}

export function formatRunningTimer(clockInAt: string): string {
  const start = parseISO(clockInAt)
  const now = new Date()
  const duration = intervalToDuration({ start, end: now })
  return formatDuration(duration, { format: ['hours', 'minutes'] }) || '0 minutes'
}

export function formatDateTime(iso: string): string {
  return format(parseISO(iso), 'MMM d, yyyy h:mm a')
}

export function formatDate(iso: string): string {
  return format(parseISO(iso), 'MMM d, yyyy')
}

export function formatTime(iso: string): string {
  return format(parseISO(iso), 'h:mm a')
}

export function getWeekBounds(): { start: Date; end: Date } {
  const now = new Date()
  const dayOfWeek = now.getDay() // 0 = Sunday
  const start = new Date(now)
  start.setDate(now.getDate() - dayOfWeek)
  start.setHours(0, 0, 0, 0)
  const end = new Date(start)
  end.setDate(start.getDate() + 6)
  end.setHours(23, 59, 59, 999)
  return { start, end }
}

export function getYearBounds(): { start: Date; end: Date } {
  const now = new Date()
  const start = new Date(now.getFullYear(), 0, 1)
  const end = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999)
  return { start, end }
}

export function getOvertimeStatus(
  weeklyHours: number,
  warningThreshold = 35,
  overtimeThreshold = 40
): 'normal' | 'warning' | 'overtime' {
  if (weeklyHours >= overtimeThreshold) return 'overtime'
  if (weeklyHours >= warningThreshold) return 'warning'
  return 'normal'
}

export function isNovemberOrDecember(): boolean {
  const month = new Date().getMonth() // 0-indexed
  return month === 10 || month === 11
}

export function getClientIP(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  return request.headers.get('x-real-ip') ?? 'unknown'
}
