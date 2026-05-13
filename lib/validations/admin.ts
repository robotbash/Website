import { z } from 'zod'
import { passwordSchema } from './auth'

export const createEmployeeSchema = z.object({
  fullName: z.string().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().email('Enter a valid email address'),
  annualPtoHours: z.number().min(0).max(10000).default(40),
  hireDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  role: z.enum(['employee', 'admin']).default('employee'),
})

export const updateEmployeeSchema = z.object({
  fullName: z.string().min(2).max(100).optional(),
  email: z.string().email().optional(),
  annualPtoHours: z.number().min(0).max(10000).optional(),
  hireDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  role: z.enum(['employee', 'admin']).optional(),
  isActive: z.boolean().optional(),
})

export const holidaySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date'),
  name: z.string().min(1, 'Name is required').max(100),
  isPaid: z.boolean().default(true),
})

export const announcementSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  body: z.string().min(1, 'Body is required').max(2000),
  expiresAt: z.string().datetime().nullable().optional(),
})

export const settingsSchema = z.object({
  breaks_paid_default: z.boolean().optional(),
  pto_rollover_policy: z.enum(['reset', 'carryover', 'carryover_cap']).optional(),
  pto_rollover_cap_hours: z.number().min(0).max(1000).optional(),
  pay_period_type: z.enum(['weekly', 'biweekly']).optional(),
  overtime_threshold: z.number().min(1).max(168).optional(),
  overtime_warning: z.number().min(1).max(168).optional(),
})

export const exportSchema = z.object({
  type: z.enum(['timesheets', 'pto', 'sick_days', 'call_offs']),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  employeeIds: z.array(z.string().uuid()).optional(),
}).refine((d) => d.startDate <= d.endDate, {
  message: 'End date must be on or after start date',
  path: ['endDate'],
})

export const exportPresetSchema = z.object({
  name: z.string().min(1).max(100),
  config: z.object({
    type: z.enum(['timesheets', 'pto', 'sick_days', 'call_offs']),
    date_range_type: z.enum(['custom', 'this_week', 'last_week', 'this_period', 'last_period', 'this_month', 'last_month']),
    include_all_employees: z.boolean(),
    employee_ids: z.array(z.string().uuid()).optional(),
  }),
})
