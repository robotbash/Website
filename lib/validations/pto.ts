import { z } from 'zod'

// Base object without the refinement so .extend() works on it.
const ptoRequestBase = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date'),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date'),
  hoursPerDay: z.number().min(0.5).max(24),
  note: z.string().max(300).optional(),
})

// Exported schema includes the date-order refinement.
export const ptoRequestSchema = ptoRequestBase.refine((d) => d.startDate <= d.endDate, {
  message: 'End date must be on or after start date',
  path: ['endDate'],
})

// Admin schema extends the base (ZodObject) — can't extend ZodEffects.
export const adminPtoSchema = ptoRequestBase.extend({
  userId: z.string().uuid(),
}).refine((d) => d.startDate <= d.endDate, {
  message: 'End date must be on or after start date',
  path: ['endDate'],
})

export const ptoReviewSchema = z.object({
  status: z.enum(['approved', 'denied']),
  adminNotes: z.string().max(300).optional(),
})

export const ptoBalanceAdjustSchema = z.object({
  userId: z.string().uuid(),
  adjustment: z.number().min(-999).max(999),
  reason: z.string().min(3, 'Reason is required').max(300),
})

export const sickDaySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date'),
  type: z.enum(['sick', 'call_off']),
  note: z.string().max(300).optional(),
})

export const adminSickDaySchema = sickDaySchema.extend({
  userId: z.string().uuid(),
})
