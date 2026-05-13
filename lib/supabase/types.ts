export type UserRole = 'employee' | 'admin'
export type CorrectionStatus = 'pending' | 'approved' | 'denied'
export type SickDayType = 'sick' | 'call_off'
export type PtoRolloverPolicy = 'reset' | 'carryover' | 'carryover_cap'

export interface User {
  id: string
  full_name: string
  email: string
  role: UserRole
  is_active: boolean
  hire_date: string | null
  annual_pto_hours: number
  pto_balance: number
  force_password_reset: boolean
  created_at: string
  updated_at: string
}

export interface TimeEntry {
  id: string
  user_id: string
  clock_in_at: string
  clock_out_at: string | null
  notes: string | null
  was_corrected: boolean
  created_at: string
  updated_at: string
}

export interface Break {
  id: string
  time_entry_id: string
  start_at: string
  end_at: string | null
  is_paid: boolean
  created_at: string
}

export interface PtoEntry {
  id: string
  user_id: string
  start_date: string
  end_date: string
  hours: number
  note: string | null
  logged_by_user_id: string
  created_at: string
}

export interface SickDay {
  id: string
  user_id: string
  date: string
  type: SickDayType
  note: string | null
  logged_by_user_id: string
  created_at: string
}

export interface PunchCorrection {
  id: string
  user_id: string
  requested_clock_in: string
  requested_clock_out: string | null
  reason: string
  status: CorrectionStatus
  reviewed_by: string | null
  reviewed_at: string | null
  original_entry_id: string | null
  admin_notes: string | null
  created_at: string
}

export interface AuditLog {
  id: string
  user_id: string | null
  action: string
  target_user_id: string | null
  target_record_id: string | null
  table_name: string | null
  old_value: Record<string, unknown> | null
  new_value: Record<string, unknown> | null
  ip_address: string | null
  user_agent: string | null
  created_at: string
}

export interface LoginAttempt {
  id: string
  email: string
  ip_address: string | null
  success: boolean
  attempted_at: string
}

export interface Holiday {
  id: string
  date: string
  name: string
  is_paid: boolean
  created_by: string | null
  created_at: string
}

export interface Announcement {
  id: string
  title: string
  body: string
  created_by: string
  created_at: string
  expires_at: string | null
}

export interface AnnouncementDismissal {
  user_id: string
  announcement_id: string
  dismissed_at: string
}

export interface ExportPreset {
  id: string
  name: string
  config: ExportConfig
  created_by: string
  created_at: string
}

export interface ExportConfig {
  type: 'timesheets' | 'pto' | 'sick_days' | 'call_offs'
  date_range_type: 'custom' | 'this_week' | 'last_week' | 'this_period' | 'last_period' | 'this_month' | 'last_month'
  include_all_employees: boolean
  employee_ids?: string[]
}

export interface InviteToken {
  id: string
  email: string
  token: string
  created_by: string
  expires_at: string
  used_at: string | null
  created_at: string
}

export interface Settings {
  breaks_paid_default: boolean
  pto_rollover_policy: PtoRolloverPolicy
  pto_rollover_cap_hours: number
  pay_period_type: 'weekly' | 'biweekly'
  overtime_threshold: number
  overtime_warning: number
}

export type Database = {
  public: {
    Tables: {
      users: { Row: User }
      time_entries: { Row: TimeEntry }
      breaks: { Row: Break }
      pto_entries: { Row: PtoEntry }
      sick_days: { Row: SickDay }
      punch_corrections: { Row: PunchCorrection }
      audit_log: { Row: AuditLog }
      login_attempts: { Row: LoginAttempt }
      holidays: { Row: Holiday }
      announcements: { Row: Announcement }
      announcement_dismissals: { Row: AnnouncementDismissal }
      export_presets: { Row: ExportPreset }
      invite_tokens: { Row: InviteToken }
      settings: { Row: { key: string; value: unknown } }
    }
  }
}
