import { z } from 'zod'

export const correctionSchema = z.object({
  requestedClockIn: z.string().datetime({ message: 'Invalid date/time' }),
  requestedClockOut: z.string().datetime({ message: 'Invalid date/time' }).nullable().optional(),
  reason: z.string().min(5, 'Please provide a brief reason').max(500),
  originalEntryId: z.string().uuid().nullable().optional(),
})

export const adminCorrectionReviewSchema = z.object({
  status: z.enum(['approved', 'denied']),
  adminNotes: z.string().max(500).optional(),
  requestedClockIn: z.string().datetime().optional(),
  requestedClockOut: z.string().datetime().nullable().optional(),
})
